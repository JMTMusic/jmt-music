-- Content Workspace — Stage 1: schema only.
-- Additive only. New table. Not yet applied to Supabase; not yet used by any app code
-- beyond the data layer built alongside this migration (Stage 1 of the approved staged
-- plan — schema + data layer, no Control Center UI yet).
--
-- Architecture context (full detail: "Content Workspace - Architecture & Milestone One
-- Plan (DRAFT).md" in the Knowledge Base): a Content Item is deliberately its own table,
-- not a repurposed `projects` row and not a bent extension of the Universal Project
-- model. A Content Item optionally references a Project, Client, and/or Beat — the same
-- "optional relationship, not required parent" shape `projects` already uses for
-- client_id/beat_id — but it is not an earlier or later stage of any of those records,
-- so it does not extend them the way Lead Pipeline extends `clients`.
--
-- There is no separate `releases` table yet (Beat and Release remain deliberately
-- collapsed into one `beats` row, per the documented simplification in
-- `18 - JMT OS Architecture.md`) — so `beat_id` is the release connection for now. If
-- Beat/Release ever split into two objects, a real `release_id` column can be added
-- later without disturbing anything here.

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,

  title text not null,
  content_type text
    check (
      content_type is null or content_type in (
        'piano_performance','cover','original_performance','beat_showcase','beat_breakdown',
        'behind_the_beat','behind_the_scenes','studio_tour','workflow','production_tip',
        'piano_tip','recording_tip','release_announcement','client_highlight','testimonial',
        'gear','lifestyle','story_post','other'
      )
    ),

  status text not null default 'idea'
    check (status in (
      'idea','planned','needs_filming','needs_editing','ready','scheduled','published','archived'
    )),
  priority text not null default 'normal'
    check (priority in ('low','normal','high','urgent')),

  platforms text[] not null default '{}'::text[]
    check (
      platforms <@ array[
        'instagram_reel','instagram_feed','instagram_story','youtube_short','youtube',
        'tiktok','facebook','website','email'
      ]::text[]
    ),
  platform_urls jsonb not null default '{}'::jsonb,

  notes text,

  -- Optional relationships. Preserve the Content Item if the linked row is removed —
  -- it is its own historical record, not a dependent child of any of these three.
  project_id uuid references public.projects(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  beat_id uuid references public.beats(id) on delete set null,

  scheduled_at timestamptz,
  published_at timestamptz,

  -- Asset tracking is metadata-only in Milestone 1 — presence/readiness plus an optional
  -- reference (wherever the file actually lives: local drive, cloud folder, editor
  -- handoff link). No Supabase Storage upload pipeline yet; see the architecture doc,
  -- Section 3, for why this is deliberately deferred rather than built speculatively.
  asset_video_ready boolean not null default false,
  asset_video_url text,
  asset_audio_ready boolean not null default false,
  asset_audio_url text,
  asset_artwork_ready boolean not null default false,
  asset_artwork_url text,
  asset_thumbnail_ready boolean not null default false,
  asset_thumbnail_url text,
  asset_caption_ready boolean not null default false,
  caption text,
  asset_hashtags_ready boolean not null default false,
  hashtags text[] not null default '{}'::text[],

  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.content_items is
  'Content Workspace, Milestone 1. One row per piece of managed marketing content, tracked through its own 8-stage editing pipeline (idea through archived) — separate from the Universal Project model''s generic 5-phase lifecycle, which cannot represent content-specific stages without overloading detail_stage. Automates editing, not posting: there is no publish action here, only a record of what happened. Manual publishing stays the deliberate final step.';
comment on column public.content_items.content_type is
  'Constrained but extensible, same convention as clients.stage: a checked list today, widened by a future migration if the taxonomy grows — not a native Postgres enum type, so extending it never requires an ALTER TYPE.';
comment on column public.content_items.status is
  'The pipeline stage. See lib/content/pipeline.ts for the full allowed-transition map — this column intentionally has no default "any status to any status" path.';
comment on column public.content_items.platforms is
  'Every platform this item is intended for. Constrained via the <@ (is contained by) array operator against the same allow-list enforced in lib/content/validation.ts, so the app layer and the database can never silently drift apart.';
comment on column public.content_items.platform_urls is
  'Published destination links, keyed by platform (e.g. {"instagram_reel": "https://..."}) — populated as each platform actually goes live, not required up front.';
comment on column public.content_items.project_id is
  'Optional. Set when this content was produced under a formal client Project (e.g. a delivery highlight). ON DELETE SET NULL: the Content Item is its own record and must not disappear if the Project is ever deleted.';
comment on column public.content_items.client_id is
  'Optional. Set when this content is about or features a specific client/artist relationship (e.g. a testimonial). ON DELETE SET NULL, same reasoning as project_id.';
comment on column public.content_items.beat_id is
  'Optional. Set when this content is about a specific beat. Also stands in for a "release" link today — there is no separate releases table yet (Beat and Release are one row by design). ON DELETE SET NULL, same reasoning as project_id.';
comment on column public.content_items.scheduled_at is
  'When this is planned to publish. A planning field the caller sets directly — distinct from published_at, which the application sets automatically the first time status reaches ''published''.';
comment on column public.content_items.published_at is
  'Set once, automatically, the first time status transitions to ''published'' (lib/content/pipeline.ts, shouldSetPublishedAt) — never set directly by a general update, and never overwritten on a later archive/restore cycle.';
comment on column public.content_items.asset_video_ready is
  'Presence/readiness flag only — Milestone 1 tracks metadata, not files. Paired with asset_video_url as an optional reference to wherever the actual file lives.';
comment on column public.content_items.asset_video_url is
  'Optional reference to the video file''s actual location (local drive, cloud folder, editor handoff link, ...). Not validated as a strict URL — this may be a path, not necessarily a web address.';
comment on column public.content_items.asset_audio_ready is
  'Presence/readiness flag for a standalone audio asset, distinct from video''s own embedded audio (e.g. a beat preview posted as a waveform clip, or a voice-memo source file).';
comment on column public.content_items.asset_artwork_ready is
  'Presence/readiness flag for a static image/graphic asset (e.g. a release-announcement graphic).';
comment on column public.content_items.asset_thumbnail_ready is
  'Presence/readiness flag for a thumbnail image, distinct from artwork — a thumbnail is specifically the still frame/cover shown before a video plays.';
comment on column public.content_items.asset_caption_ready is
  'Presence/readiness flag for the caption text itself, stored in the caption column below once written.';
comment on column public.content_items.asset_hashtags_ready is
  'Presence/readiness flag for the hashtag set stored in the hashtags column below once written.';
comment on column public.content_items.created_by is
  'The staff profile that created this row. Null is valid (e.g. a future automated suggestion) but nothing automated writes here yet in Milestone 1.';

create index if not exists content_items_property_id_idx
  on public.content_items(property_id);
create index if not exists content_items_property_status_idx
  on public.content_items(property_id, status);
create index if not exists content_items_priority_idx
  on public.content_items(priority);
create index if not exists content_items_scheduled_at_idx
  on public.content_items(scheduled_at) where scheduled_at is not null;
create index if not exists content_items_published_at_idx
  on public.content_items(published_at) where published_at is not null;
create index if not exists content_items_project_id_idx
  on public.content_items(project_id) where project_id is not null;
create index if not exists content_items_client_id_idx
  on public.content_items(client_id) where client_id is not null;
create index if not exists content_items_beat_id_idx
  on public.content_items(beat_id) where beat_id is not null;

-- Reuses the existing public.set_updated_at() trigger function already used by every
-- other table in this schema (control_center_schema.sql).
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'content_items_set_updated_at'
      and tgrelid = 'public.content_items'::regclass
  ) then
    execute 'create trigger content_items_set_updated_at before update on public.content_items for each row execute function public.set_updated_at()';
  end if;
end $$;

alter table public.content_items enable row level security;

-- Internal only, same posture as projects/clients/project_setups — no anonymous policy.
-- Content Workspace has no public-facing surface, unlike Project Setup's token-gated route.
create policy "content_items_staff_read"
on public.content_items for select to authenticated
using (public.current_app_role() in ('owner', 'editor', 'viewer'));

create policy "content_items_owner_all"
on public.content_items for all to authenticated
using (public.current_app_role() = 'owner')
with check (public.current_app_role() = 'owner');

create policy "content_items_editor_insert"
on public.content_items for insert to authenticated
with check (public.current_app_role() = 'editor');

create policy "content_items_editor_update"
on public.content_items for update to authenticated
using (public.current_app_role() = 'editor')
with check (public.current_app_role() = 'editor');

-- ---------------------------------------------------------------------------
-- ROLLBACK (manual only — do not run unless reverting this migration)
-- ---------------------------------------------------------------------------
-- drop table if exists public.content_items;
-- (Safe: this is a new table introduced by this migration; nothing else references it.)
