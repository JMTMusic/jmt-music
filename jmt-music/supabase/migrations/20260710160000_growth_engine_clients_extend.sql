-- Growth Engine Foundation: extend clients into the Lead Pipeline model
-- Additive only. No destructive statements. Existing rows are preserved and backfilled.
-- Do NOT run this until the verification block in supabase/README.md has been run
-- and its results reviewed (row counts, distinct stage values, existing constraints).

alter table public.clients
  add column if not exists artist_name text,
  add column if not exists contact_name text,
  add column if not exists platform text,
  add column if not exists social_links jsonb not null default '{}'::jsonb,
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists is_archived boolean not null default false,
  add column if not exists legacy_stage text,
  add column if not exists source text not null default 'manual';

comment on column public.clients.name is
  'Deprecated in favor of artist_name/contact_name. Retained for backward compatibility. Do not write new values here.';
comment on column public.clients.legacy_stage is
  'Audit trail: the pre-Growth-Engine stage value, preserved permanently for rollback. Never displayed in the UI.';
comment on column public.clients.is_archived is
  'Status modifier, independent of stage. Archived is not a lifecycle stage. Default views exclude archived rows.';
comment on column public.clients.platform is
  'Free text by design (Instagram, Email, Website, Fiverr, AirGigs, SoundBetter, Referral, Other, ...) — same convention as projects.detail_stage: vocabulary can evolve without a schema change.';

-- 1. Backfill artist_name from the legacy name column for every existing row.
--    New rows going forward populate artist_name directly and may leave name null.
update public.clients
set artist_name = name
where artist_name is null and name is not null;

-- 2. Preserve the original stage value for every row before it is remapped.
update public.clients
set legacy_stage = stage
where legacy_stage is null;

-- 3. Archived is decoupled from the stage funnel: old stage = 'archived' becomes
--    is_archived = true, not a 9th lifecycle value.
update public.clients
set is_archived = true
where legacy_stage = 'archived';

-- 4. Conservative old -> new stage mapping. See the implementation plan for full reasoning:
--      new         -> new_lead
--      contacted   -> conversation   (back-and-forth started; does not assume qualification/proposal)
--      in_progress -> project        (HANDOFF.md: old "In Progress" was defined as "tied to linked Projects")
--      completed   -> project        (conservative: completion alone does not prove repeat business)
--      archived    -> project        (is_archived flag carries the archived status separately, see step 3)
--    Any legacy value outside this documented set falls back to 'new_lead' conservatively
--    rather than being silently dropped or left in an invalid state.
update public.clients
set stage = case legacy_stage
  when 'new' then 'new_lead'
  when 'contacted' then 'conversation'
  when 'in_progress' then 'project'
  when 'completed' then 'project'
  when 'archived' then 'project'
  else 'new_lead'
end
where legacy_stage is not null;

-- 5. Widen the stage constraint to the approved 8-stage lifecycle.
--    The constraint is located by inspecting pg_constraint rather than assuming its
--    generated name, since the original migration did not name it explicitly.
do $$
declare
  existing_constraint text;
begin
  select con.conname into existing_constraint
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'clients'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%stage%';

  if existing_constraint is not null then
    execute format('alter table public.clients drop constraint %I', existing_constraint);
  end if;
end $$;

alter table public.clients
  add constraint clients_stage_check
  check (stage in ('new_lead','qualified','conversation','proposal_sent','negotiating','booked','project','repeat_client'));

-- 6. artist_name becomes required going forward. All existing rows are backfilled by step 1;
--    this only fails if some row had both name and artist_name null, which the verification
--    block's row/column check is meant to catch before this file is ever run.
alter table public.clients alter column artist_name set not null;

create index if not exists clients_property_archived_idx on public.clients(property_id, is_archived, stage);
create index if not exists clients_property_followup_idx on public.clients(property_id, next_follow_up_at) where next_follow_up_at is not null;

-- ---------------------------------------------------------------------------
-- ROLLBACK (manual only — do not run unless reverting this migration)
-- ---------------------------------------------------------------------------
-- alter table public.clients drop constraint if exists clients_stage_check;
-- alter table public.clients add constraint clients_stage_check
--   check (stage in ('new','contacted','in_progress','completed','archived'));
-- update public.clients set stage = legacy_stage where legacy_stage is not null;
-- alter table public.clients alter column artist_name drop not null;
-- -- Columns are intentionally left in place even on rollback (non-destructive);
-- -- drop them only as a separate, explicitly reviewed follow-up if truly unwanted:
-- -- alter table public.clients drop column if exists artist_name, drop column if exists contact_name,
-- --   drop column if exists platform, drop column if exists social_links, drop column if exists tags,
-- --   drop column if exists next_follow_up_at, drop column if exists is_archived,
-- --   drop column if exists legacy_stage, drop column if exists source;
