-- Sales module — MVP schema.
-- Additive only. New table. Not applied automatically — apply manually in the Supabase
-- SQL Editor per this project's convention (see supabase/README.md).
--
-- A Sales Opportunity is deliberately its own table, not a repurposed `clients` row and
-- not a bent extension of the Growth Engine's Lead Pipeline. The Lead Pipeline
-- (`clients.stage`) models an ongoing artist/client *relationship* — referrals, past
-- clients, an artist JMT Music reached out to. A Sales Opportunity models a transactional,
-- proposal-based freelance-marketplace pitch (AirGigs, Fiverr, SoundBetter, and similar
-- one-off inbound gig requests) with its own concrete semantics — buyer instructions,
-- turnaround/revision terms, a submitted work sample, a proposal deadline — that don't fit
-- the relationship-first Lead Pipeline without overloading it. The two pipelines are
-- siblings, not layers: an opportunity does not have to pass through the Lead Pipeline to
-- become a Project, and a Lead does not have to pass through Sales. Both converge on the
-- same `clients` and `projects` tables at the point real work begins — see
-- converted_client_id / converted_project_id below, and the "Convert to Project" action in
-- app/control-center/sales/actions.ts, which reuses app/control-center/projects/actions.ts's
-- createProject exactly the way Lead Pipeline's convertLeadToProject already does.
--
-- One Client may have multiple Sales Opportunities over time (a past client pitching a new
-- gig, or one artist running several concurrent marketplace conversations). `client_id`
-- below is the optional pre-conversion link for that case — set when an opportunity is
-- already known to be about an existing Client, distinct from `converted_client_id` (the
-- outcome once conversion actually happens, which may be this same Client or a brand new
-- one). Not yet exposed in the create/edit UI in this MVP pass — the column exists now so
-- the Opportunity Engine can build that picker later without a schema change; the Convert to
-- Project action already uses it automatically when present (see sales/actions.ts).

create table if not exists public.sales_opportunities (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,

  title text not null,
  artist_name text not null,
  artist_email text,

  -- Optional pre-conversion link to an existing Client. ON DELETE SET NULL: this row is its
  -- own historical sales record and must not disappear if the linked Client is later removed.
  client_id uuid references public.clients(id) on delete set null,

  platform text not null
    check (platform in (
      'airgigs','fiverr','soundbetter','instagram','website','email','referral','local','other'
    )),
  service_type text not null
    check (service_type in (
      'production','mixing','mastering','production_mix_master','session_piano',
      'session_keys','beat_license','custom','other'
    )),
  genre text,

  budget_amount numeric(10, 2),
  currency text not null default 'USD',

  status text not null default 'new_lead'
    check (status in (
      'new_lead','conversation','proposal_draft','proposal_sent','waiting',
      'negotiating','won','lost','converted'
    )),
  probability text not null default 'medium'
    check (probability in ('low', 'medium', 'high')),

  proposal_sent_at timestamptz,
  follow_up_at timestamptz,
  deadline date,

  source_url text,
  music_url text,
  notes text,
  proposal_text text,
  buyer_instructions text,

  turnaround_days integer check (turnaround_days is null or turnaround_days >= 0),
  revision_count integer check (revision_count is null or revision_count >= 0),

  sample_title text,
  sample_description text,
  sample_url text,

  lost_reason text,

  -- Set only by the "Convert to Project" action (app/control-center/sales/actions.ts), never
  -- by a general edit. ON DELETE SET NULL: this row is its own historical sales record and
  -- must not disappear (or silently re-open) if the resulting Client/Project is later removed.
  converted_project_id uuid references public.projects(id) on delete set null,
  converted_client_id uuid references public.clients(id) on delete set null,

  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.sales_opportunities is
  'Sales module, MVP. One row per potential client engagement sourced from a freelance marketplace, social platform, referral, or direct inquiry — not yet a Project. Converts into the existing Client/Project tables via converted_client_id/converted_project_id; the opportunity record itself is preserved afterward, never deleted.';
comment on column public.sales_opportunities.status is
  'Pipeline stage. Permissive, any-to-any transition (same posture as clients.stage / Lead Pipeline) — a real sales conversation does not move strictly forward. ''converted'' is set only by the Convert to Project action, not selectable as a manual status change.';
comment on column public.sales_opportunities.probability is
  'A coarse, manually-set confidence estimate — low/medium/high, not a numeric percentage. Deliberately simple for the MVP; a scored/weighted model can replace this later without touching any other column.';
comment on column public.sales_opportunities.proposal_sent_at is
  'When the proposal was actually sent — set by whoever logs the opportunity, not automatically. Distinct from follow_up_at (when to check back) and deadline (the buyer''s own deadline, if any).';
comment on column public.sales_opportunities.converted_project_id is
  'Set once, by the Convert to Project action. A duplicate-conversion guard checks this is still null before allowing another conversion.';
comment on column public.sales_opportunities.converted_client_id is
  'The Client this opportunity resolved to — either an existing Client the opportunity was matched to, or a new one created at conversion time. Same table, same architecture as the Growth Engine''s Lead Pipeline; this is not a second Client system.';
comment on column public.sales_opportunities.client_id is
  'Optional pre-conversion link to an existing Client — set when this opportunity is already known to be about someone already in the Lead Pipeline. Distinct from converted_client_id (the actual outcome once conversion happens). One Client may have multiple Sales Opportunities.';

create index if not exists sales_opportunities_property_id_idx
  on public.sales_opportunities(property_id);
create index if not exists sales_opportunities_property_status_idx
  on public.sales_opportunities(property_id, status);
create index if not exists sales_opportunities_client_id_idx
  on public.sales_opportunities(client_id) where client_id is not null;
create index if not exists sales_opportunities_follow_up_at_idx
  on public.sales_opportunities(follow_up_at) where follow_up_at is not null;
create index if not exists sales_opportunities_proposal_sent_at_idx
  on public.sales_opportunities(proposal_sent_at) where proposal_sent_at is not null;
create index if not exists sales_opportunities_converted_project_id_idx
  on public.sales_opportunities(converted_project_id) where converted_project_id is not null;
create index if not exists sales_opportunities_converted_client_id_idx
  on public.sales_opportunities(converted_client_id) where converted_client_id is not null;

-- Reuses the existing public.set_updated_at() trigger function already used by every other
-- table in this schema (control_center_schema.sql).
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'sales_opportunities_set_updated_at'
      and tgrelid = 'public.sales_opportunities'::regclass
  ) then
    execute 'create trigger sales_opportunities_set_updated_at before update on public.sales_opportunities for each row execute function public.set_updated_at()';
  end if;
end $$;

alter table public.sales_opportunities enable row level security;

-- Internal only, same posture as projects/clients/content_items — no anonymous policy.
create policy "sales_opportunities_staff_read"
on public.sales_opportunities for select to authenticated
using (public.current_app_role() in ('owner', 'editor', 'viewer'));

create policy "sales_opportunities_owner_all"
on public.sales_opportunities for all to authenticated
using (public.current_app_role() = 'owner')
with check (public.current_app_role() = 'owner');

create policy "sales_opportunities_editor_insert"
on public.sales_opportunities for insert to authenticated
with check (public.current_app_role() = 'editor');

create policy "sales_opportunities_editor_update"
on public.sales_opportunities for update to authenticated
using (public.current_app_role() = 'editor')
with check (public.current_app_role() = 'editor');

-- ---------------------------------------------------------------------------
-- ROLLBACK (manual only — do not run unless reverting this migration)
-- ---------------------------------------------------------------------------
-- drop table if exists public.sales_opportunities;
-- (Safe: this is a new table introduced by this migration; nothing else references it.)
