-- Growth Engine Foundation: evolve Template Library into the Communication Playbook.
-- Additive/renaming only. No destructive statements, no column ever dropped.
-- This extends the existing template_library table in place (renamed) rather than
-- creating a parallel table — template_library has not been deployed to production and
-- carries no real rows, so a rename + column evolution is safe and is the correct
-- non-duplicating move per the JMT OS Source of Truth principle (18, Section 4).

-- 1. Rename the table. Preserves all data, constraints, indexes, RLS policies, and
--    foreign key relationships automatically — Postgres updates catalog references.
alter table if exists public.template_library rename to communication_playbook;

-- 2. Rename columns to match the Playbook vocabulary.
alter table public.communication_playbook rename column content to message_body;
alter table public.communication_playbook rename column description to purpose;

-- 3. New columns.
alter table public.communication_playbook
  add column if not exists best_used_for text[] not null default '{}'::text[],
  add column if not exists variables text[] not null default '{}'::text[],
  add column if not exists internal_notes text,
  add column if not exists version_number integer not null default 1,
  add column if not exists status text not null default 'draft',
  add column if not exists is_favorite boolean not null default false;

comment on table public.communication_playbook is
  'The Communication Playbook: documents how JMT Music actually communicates, not a clipboard of copy/paste snippets. Each row is a "Play." Manually authored and refined over time via communication_playbook_versions — no AI generation.';
comment on column public.communication_playbook.category is
  'Bounded taxonomy (unlike the old free-text platform category): outreach, discovery, onboarding, production, delivery, reviews, follow_up, internal_sop. Constrained below.';
comment on column public.communication_playbook.best_used_for is
  'Free text by design — the platforms/contexts a Play fits (Instagram DM, Email, Networking, ...). This is where the old free-text "category" concept (platform) now lives.';
comment on column public.communication_playbook.purpose is
  'Internal description of intent — never copied to clipboard, never shown to the artist.';
comment on column public.communication_playbook.message_body is
  'The actual message text. The only field "Copy Message" ever copies.';
comment on column public.communication_playbook.variables is
  'Documented {{variable}} placeholder names used in message_body (e.g. artist_name). Convention only — not parsed or auto-filled.';
comment on column public.communication_playbook.internal_notes is
  'Never copied to clipboard. Context for why this Play works and how to use it well.';
comment on column public.communication_playbook.version_number is
  'Current version marker. Bumped by the update action whenever message_body/purpose/title/variables/internal_notes changes; prior state is snapshotted to communication_playbook_versions first.';
comment on column public.communication_playbook.status is
  'draft | active | archived. Supersedes the old is_archived boolean (retained below, unused going forward, per the non-destructive migration convention already established in this project).';
comment on column public.communication_playbook.is_archived is
  'Deprecated 2026-07-10, superseded by status. Retained rather than dropped — do not write to this column going forward; do not read it either. Kept only so no prior migration ever needs a destructive rollback.';

-- 4. Backfill status from the old is_archived boolean before constraining it.
--    Conservative default for previously-active rows: "draft" — is_archived=false only
--    tells us a row wasn't archived, not that it was in active use.
update public.communication_playbook
set status = case when is_archived then 'archived' else 'draft' end;

alter table public.communication_playbook
  add constraint communication_playbook_status_check
  check (status in ('draft', 'active', 'archived'));

-- 5. Backfill any existing category value into the new bounded taxonomy before
--    constraining it. Old categories were platform names (Instagram, Email, Fiverr, ...);
--    those now belong in best_used_for, not category. Move them there, then default
--    category itself to 'outreach' conservatively for any row this migration cannot
--    confidently classify — defensive only, expected to affect zero rows today.
update public.communication_playbook
set best_used_for = case
      when best_used_for = '{}'::text[] and category is not null and category not in
        ('outreach','discovery','onboarding','production','delivery','reviews','follow_up','internal_sop')
      then array[category]
      else best_used_for
    end,
    category = case
      when category in ('outreach','discovery','onboarding','production','delivery','reviews','follow_up','internal_sop')
      then category
      else 'outreach'
    end;

do $$
declare
  existing_constraint text;
begin
  select con.conname into existing_constraint
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'communication_playbook'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%category%';

  if existing_constraint is not null then
    execute format('alter table public.communication_playbook drop constraint %I', existing_constraint);
  end if;
end $$;

alter table public.communication_playbook
  add constraint communication_playbook_category_check
  check (category in ('outreach','discovery','onboarding','production','delivery','reviews','follow_up','internal_sop'));

-- 6. Version history — append-only log so refinements over time are preserved, not
--    overwritten. Populated by the updatePlay server action (snapshots the pre-update
--    row before applying changes), not by a trigger, keeping the "when does this
--    happen" logic in the application layer per this project's existing convention.
create table if not exists public.communication_playbook_versions (
  id uuid primary key default gen_random_uuid(),
  playbook_id uuid not null references public.communication_playbook(id) on delete cascade,
  version_number integer not null,
  title text not null,
  purpose text,
  message_body text not null,
  variables text[] not null default '{}'::text[],
  internal_notes text,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now()
);

comment on table public.communication_playbook_versions is
  'Append-only snapshot log for the Communication Playbook. One row per prior version of a Play, written just before an update overwrites it. Read-only in the UI — no restore/diff feature in this build.';

create index if not exists communication_playbook_versions_playbook_idx
  on public.communication_playbook_versions(playbook_id, version_number desc);

alter table public.communication_playbook_versions enable row level security;

create policy "communication_playbook_versions_staff_read"
on public.communication_playbook_versions for select to authenticated
using (public.current_app_role() in ('owner', 'editor', 'viewer'));

create policy "communication_playbook_versions_owner_all"
on public.communication_playbook_versions for all to authenticated
using (public.current_app_role() = 'owner')
with check (public.current_app_role() = 'owner');

-- Editors write version snapshots as a side effect of their own updates to the main
-- table — insert-only, matching the append-only nature of this log. No editor update
-- or delete policy, consistent with every other Growth Engine table's owner-only
-- deletion posture.
create policy "communication_playbook_versions_editor_insert"
on public.communication_playbook_versions for insert to authenticated
with check (public.current_app_role() = 'editor');

-- 7. New indexes for the fields Search and the list/detail views actually query by.
create index if not exists communication_playbook_property_status_idx
  on public.communication_playbook(property_id, status, category, sort_order);
create index if not exists communication_playbook_property_favorite_idx
  on public.communication_playbook(property_id, is_favorite) where is_favorite = true;

-- ---------------------------------------------------------------------------
-- ROLLBACK (manual only — do not run unless reverting this migration)
-- ---------------------------------------------------------------------------
-- drop table if exists public.communication_playbook_versions;
-- drop index if exists communication_playbook_property_status_idx;
-- drop index if exists communication_playbook_property_favorite_idx;
-- alter table public.communication_playbook drop constraint if exists communication_playbook_status_check;
-- alter table public.communication_playbook drop constraint if exists communication_playbook_category_check;
-- alter table public.communication_playbook rename column message_body to content;
-- alter table public.communication_playbook rename column purpose to description;
-- alter table public.communication_playbook rename to template_library;
-- -- New columns (best_used_for, variables, internal_notes, version_number, status,
-- -- is_favorite) are intentionally left in place even on rollback (non-destructive);
-- -- drop them only as a separate, explicitly reviewed follow-up if truly unwanted.
