-- A&R module — MVP schema.
-- Additive only. New table. Not applied automatically — apply manually in the Supabase
-- SQL Editor per this project's convention (see supabase/README.md).
--
-- An A&R Artist is deliberately its own table, not a repurposed `clients` row and not a
-- bent extension of `sales_opportunities`. It represents someone being researched,
-- watched, or considered — before any relationship or paid engagement exists. This is a
-- third sibling in the same converging-pipelines shape as Sales vs. the Lead Pipeline
-- (see 20260712150000_sales_opportunities.sql's own header comment for the original
-- reasoning): A&R Artist -> (optionally) a Client/Lead and/or a Sales Opportunity ->
-- a Project. Nothing has to pass through A&R to reach Sales, and nothing has to pass
-- through Sales to reach a Project — each pipeline is a real, independent entry point
-- that converges on the same `clients`/`sales_opportunities`/`projects` tables at the
-- point real work begins. This is not a second Client, Sales, or Project system.
--
-- Two distinct relationship columns, deliberately not symmetric:
--   * related_client_id — an OPTIONAL, freely editable pre-conversion link, exactly like
--     sales_opportunities.client_id: "I already know this is (or might be) client X."
--     Never protected from manual edits, and may be set well before any conversion.
--   * related_sales_opportunity_id — the CONVERSION OUTCOME, written only by the
--     "Convert to Sales" action (app/control-center/ar/actions.ts), exactly like
--     sales_opportunities.converted_project_id/converted_client_id. Never manually
--     editable. A duplicate-conversion guard checks this is still null before allowing
--     another conversion.
--
-- Fit score is a transparent, user-scored model, not an AI claim: seven 1-5 category
-- columns the user fills in by hand, an overall `fit_score` that is either the average of
-- whichever categories are filled in or a manual override (`fit_score_overridden` records
-- which), and free-text `fit_summary`/`strengths`/`opportunities`/`concerns` for the
-- user's own written observations. See lib/ar/pipeline.ts's computeFitScore for the exact
-- averaging rule. Nothing here is computed from real audio/social analysis — there is no
-- such analysis in this MVP.

create table if not exists public.ar_artists (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,

  artist_name text not null,
  handle text,

  -- primary_platform and discovery_source share the same value list (an artist's main
  -- platform and how JMT Music found them are often, but not always, the same thing — a
  -- referral about an Instagram artist has discovery_source='referral',
  -- primary_platform='instagram'). Both nullable at the schema level; the application
  -- layer requires at least one of the two on create (see lib/ar/validation.ts) rather
  -- than encoding that cross-field rule as a SQL constraint, the same posture this
  -- codebase already takes for every other multi-field business rule.
  primary_platform text
    check (primary_platform is null or primary_platform in (
      'instagram','spotify','youtube','vampr','reddit','website','local','referral','manual','other'
    )),
  discovery_source text
    check (discovery_source is null or discovery_source in (
      'instagram','spotify','youtube','vampr','reddit','website','local','referral','manual','other'
    )),

  profile_url text,
  website_url text,
  music_url text,
  email text,
  location text,
  genre text,
  subgenre text,
  bio_summary text,
  discovery_notes text,

  status text not null default 'discovered'
    check (status in (
      'discovered','reviewing','watchlist','ready_for_outreach','contacted','converted','dismissed'
    )),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),

  -- Fit score: seven user-scored categories (1-5 each, blank until reviewed), an overall
  -- score, and whether that overall was computed or manually overridden.
  fit_genre_score smallint check (fit_genre_score is null or fit_genre_score between 1 and 5),
  fit_musical_interest_score smallint check (fit_musical_interest_score is null or fit_musical_interest_score between 1 and 5),
  fit_production_opportunity_score smallint check (fit_production_opportunity_score is null or fit_production_opportunity_score between 1 and 5),
  fit_professionalism_score smallint check (fit_professionalism_score is null or fit_professionalism_score between 1 and 5),
  fit_recent_activity_score smallint check (fit_recent_activity_score is null or fit_recent_activity_score between 1 and 5),
  fit_audience_business_score smallint check (fit_audience_business_score is null or fit_audience_business_score between 1 and 5),
  fit_personal_enthusiasm_score smallint check (fit_personal_enthusiasm_score is null or fit_personal_enthusiasm_score between 1 and 5),
  fit_score numeric(3, 1) check (fit_score is null or fit_score between 1 and 5),
  fit_score_overridden boolean not null default false,
  fit_summary text,
  strengths text,
  opportunities text,
  concerns text,

  follower_count integer check (follower_count is null or follower_count >= 0),
  monthly_listener_count integer check (monthly_listener_count is null or monthly_listener_count >= 0),
  latest_release_title text,
  latest_release_date date,
  last_activity_at timestamptz,
  last_reviewed_at timestamptz,
  next_review_at timestamptz,

  outreach_recommendation text,
  outreach_draft text,

  -- See the header comment above for why these two are deliberately asymmetric.
  related_client_id uuid references public.clients(id) on delete set null,
  related_sales_opportunity_id uuid references public.sales_opportunities(id) on delete set null,

  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.ar_artists is
  'A&R module, MVP. One row per artist being researched, watched, or considered — not yet a Client, Sales Opportunity, or Project. Converts into an existing/new Client and a new Sales Opportunity via related_client_id/related_sales_opportunity_id; the A&R research record itself is preserved afterward, never deleted.';
comment on column public.ar_artists.status is
  'Pipeline stage. Permissive, any-to-any transition (same posture as clients.stage and sales_opportunities.status) — a real evaluation does not move strictly forward. ''converted'' is set only by the Convert to Sales action, not selectable as a manual status change.';
comment on column public.ar_artists.fit_score is
  'Overall fit score, 1-5. Either the average of whichever fit_*_score categories are filled in (lib/ar/pipeline.ts, computeFitScore), or a manual value the user typed directly — fit_score_overridden distinguishes the two. Null is expected and normal for an artist not yet reviewed.';
comment on column public.ar_artists.fit_score_overridden is
  'True when fit_score was typed directly by the user rather than computed from the category scores. Recomputed back to false automatically the next time any fit_*_score category is saved without an explicit override.';
comment on column public.ar_artists.opportunities is
  'Free-text notes on this specific artist''s possible creative/business upside, written during manual review. Not related to the sales_opportunities table — an A&R Artist''s "opportunities" are observations, not a formal pipeline record.';
comment on column public.ar_artists.related_client_id is
  'Optional, freely editable link to an existing Client — set whenever this artist is already known to be (or might become) a specific Client, at any point in the A&R lifecycle. Distinct from related_sales_opportunity_id below.';
comment on column public.ar_artists.related_sales_opportunity_id is
  'Set once, by the Convert to Sales action (app/control-center/ar/actions.ts) — never manually editable. A duplicate-conversion guard checks this is still null before allowing another conversion.';
comment on column public.ar_artists.outreach_draft is
  'A saved, editable draft message — never sent automatically. Composed (lib/ar/pipeline.ts, composeOutreachDraft) only from information the user has actually entered; refuses to compose anything if too little specific information exists to make a draft personal.';

create index if not exists ar_artists_property_id_idx
  on public.ar_artists(property_id);
create index if not exists ar_artists_property_status_idx
  on public.ar_artists(property_id, status);
create index if not exists ar_artists_priority_idx
  on public.ar_artists(priority);
create index if not exists ar_artists_next_review_at_idx
  on public.ar_artists(next_review_at) where next_review_at is not null;
create index if not exists ar_artists_fit_score_idx
  on public.ar_artists(fit_score) where fit_score is not null;
create index if not exists ar_artists_related_client_id_idx
  on public.ar_artists(related_client_id) where related_client_id is not null;
create index if not exists ar_artists_related_sales_opportunity_id_idx
  on public.ar_artists(related_sales_opportunity_id) where related_sales_opportunity_id is not null;

-- Reuses the existing public.set_updated_at() trigger function already used by every other
-- table in this schema (control_center_schema.sql).
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'ar_artists_set_updated_at'
      and tgrelid = 'public.ar_artists'::regclass
  ) then
    execute 'create trigger ar_artists_set_updated_at before update on public.ar_artists for each row execute function public.set_updated_at()';
  end if;
end $$;

alter table public.ar_artists enable row level security;

-- Internal only, same posture as projects/clients/sales_opportunities — no anonymous policy.
create policy "ar_artists_staff_read"
on public.ar_artists for select to authenticated
using (public.current_app_role() in ('owner', 'editor', 'viewer'));

create policy "ar_artists_owner_all"
on public.ar_artists for all to authenticated
using (public.current_app_role() = 'owner')
with check (public.current_app_role() = 'owner');

create policy "ar_artists_editor_insert"
on public.ar_artists for insert to authenticated
with check (public.current_app_role() = 'editor');

create policy "ar_artists_editor_update"
on public.ar_artists for update to authenticated
using (public.current_app_role() = 'editor')
with check (public.current_app_role() = 'editor');

-- ---------------------------------------------------------------------------
-- ROLLBACK (manual only — do not run unless reverting this migration)
-- ---------------------------------------------------------------------------
-- drop table if exists public.ar_artists;
-- (Safe: this is a new table introduced by this migration; nothing else references it.)
