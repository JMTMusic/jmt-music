-- Phase Two: Project Setup — private, post-Discovery-review experience.
-- New table. Additive only. Not yet applied to Supabase; not yet used by any app code
-- (Stage 1 of the staged plan in the Phase Two audit — schema only, no UI/routes yet).
-- Revised 2026-07-11 per approved review: token is stored hashed (never raw), the
-- Project link is protective (restrict, not cascade), and the full private-link and
-- completion lifecycle is tracked explicitly rather than inferred from status alone.

create table if not exists public.project_setups (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  project_id uuid not null unique references public.projects(id) on delete restrict,
  discovery_id uuid references public.project_discoveries(id) on delete set null,
  access_token_hash text not null unique,
  token_created_at timestamptz,
  token_version integer not null default 1,
  access_revoked_at timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'in_progress', 'submitted', 'confirmed')),
  responses jsonb not null default '{}'::jsonb,
  completed_by text
    check (completed_by in ('client', 'jonathan')),
  internal_notes text,
  created_by uuid references public.profiles(id) on delete set null,
  sent_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  confirmed_at timestamptz,
  reopened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.project_setups is
  'Phase Two: Project Setup. One row per Project, created after Jonathan reviews a Project Discovery (or manually) and decides to move forward. Answers "how will we build this project together" — not a legal agreement, not a payment record, not email automation. access_token_hash is the sole gate for the private artist-facing route; there is no anonymous RLS policy because that route reads/writes through the service role only, the same pattern already used for the inbound lead system. This row is a permanent part of the project''s historical business record — see project_id''s on delete restrict below.';
comment on column public.project_setups.project_id is
  'The anchor. Unique — one Setup per Project, not per Client, so a returning client''s second project gets its own fresh Setup rather than reusing the first. ON DELETE RESTRICT (not cascade): a Setup is part of the project''s historical business record and must not silently disappear if the Project row is ever deleted — deletion must be handled deliberately, not as a side effect.';
comment on column public.project_setups.discovery_id is
  'Optional. A Setup does not require a Discovery to have existed — Jonathan may start one manually for a referral or existing relationship.';
comment on column public.project_setups.access_token_hash is
  'Cryptographic hash of the private-link token only — the raw token is generated server-side by the application layer (not yet built) and is never stored here. Validation hashes an incoming token and compares against this column. Never expose this column, or any raw token, alongside internal_notes or other staff-only fields on any response the token route returns.';
comment on column public.project_setups.token_created_at is
  'When the current token (per token_version) was generated. Null until a link has actually been issued.';
comment on column public.project_setups.token_version is
  'Increments whenever the token is rotated/replaced (e.g. a link is regenerated after being compromised or expiring). Lets the application safely invalidate an old raw token without needing a second table — a validation check can require the presented token to match both the hash and the current version.';
comment on column public.project_setups.access_revoked_at is
  'Set when access is explicitly revoked (e.g. Setup was reopened for revision, or the link needs to be invalidated). Null means the current token, if any, is still valid.';
comment on column public.project_setups.responses is
  'Service-specific answers as a flexible object, not a rigid schema — same convention as detail_stage/platform elsewhere in this codebase, since the actual question set is expected to evolve. Deliverables, ownership intent, and timeline live here; the legal agreement itself does not.';
comment on column public.project_setups.completed_by is
  'Who actually filled it out — the client working solo, or Jonathan completing it live with them (phone/Zoom/in-person). Null until submitted.';
comment on column public.project_setups.sent_at is
  'When Jonathan actually sent/shared the link with the artist — may be after token_created_at if a token is pre-generated before sending.';
comment on column public.project_setups.started_at is
  'When the artist (or Jonathan, live) first opened the Setup experience and began answering.';
comment on column public.project_setups.submitted_at is
  'When the Setup was completed and submitted for review — distinct from confirmed_at, which is Jonathan''s own final sign-off.';
comment on column public.project_setups.confirmed_at is
  'When Jonathan confirms the submitted Setup is correct and the Project is ready to proceed. This, not submitted_at, is what should gate any future "Project is ready" state elsewhere in the system.';
comment on column public.project_setups.reopened_at is
  'Set whenever a previously submitted/confirmed Setup is reopened for revision. Distinct from access_revoked_at: reopening implies intent to complete it again, not that access is being shut off.';

create index if not exists project_setups_property_status_idx
  on public.project_setups(property_id, status);
create index if not exists project_setups_discovery_idx
  on public.project_setups(discovery_id);

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'project_setups_set_updated_at'
      and tgrelid = 'public.project_setups'::regclass
  ) then
    execute 'create trigger project_setups_set_updated_at before update on public.project_setups for each row execute function public.set_updated_at()';
  end if;
end $$;

alter table public.project_setups enable row level security;

-- Same posture as every other Growth Engine / inbound table: staff-only, no anonymous
-- policy. The private artist-facing route (not built yet) reads/writes via the
-- service-role client after hashing and validating the presented token in application
-- code, exactly like lib/inbound/repository.ts does today — it never goes through the
-- anon key or RLS.
create policy "project_setups_staff_read"
on public.project_setups for select to authenticated
using (public.current_app_role() in ('owner', 'editor', 'viewer'));

create policy "project_setups_owner_all"
on public.project_setups for all to authenticated
using (public.current_app_role() = 'owner')
with check (public.current_app_role() = 'owner');

create policy "project_setups_editor_insert"
on public.project_setups for insert to authenticated
with check (public.current_app_role() = 'editor');

create policy "project_setups_editor_update"
on public.project_setups for update to authenticated
using (public.current_app_role() = 'editor')
with check (public.current_app_role() = 'editor');

-- ---------------------------------------------------------------------------
-- ROLLBACK (manual only — do not run unless reverting this migration)
-- ---------------------------------------------------------------------------
-- drop table if exists public.project_setups;
-- (Safe: this is a new table introduced by this migration; nothing else references it.)
