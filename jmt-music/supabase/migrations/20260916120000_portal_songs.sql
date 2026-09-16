-- Client Portal v2: a song is now a real entity, not inferred from "any audio-type file."
-- A song holds its own metadata (title, version, BPM, key) and the one Supabase-hosted
-- preview-audio copy used for in-browser playback. Files (WAV masters, stems, artwork,
-- session notes) attach to a song via song_id, or float at the project level when
-- song_id is null (a contract, or a project-wide asset not tied to one song).
--
-- Comments and approvals move from being about "a file" to being about "a song" —
-- notes-at-timecode and mix approval are about the audio you're playing, not an
-- arbitrary attachment. file_id is retired from both tables in favor of song_id.

create table if not exists public.portal_songs (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  version_label text,
  bpm text check (bpm is null or char_length(bpm) <= 20),
  musical_key text check (musical_key is null or char_length(musical_key) <= 20),
  preview_audio_path text,
  visible_to_client boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portal_songs_project_created_idx on public.portal_songs(project_id, created_at desc);

alter table public.portal_songs enable row level security;
create policy "portal_songs_staff_read" on public.portal_songs for select to authenticated
using (public.current_app_role() in ('owner', 'editor', 'viewer'));
create policy "portal_songs_owner_all" on public.portal_songs for all to authenticated
using (public.current_app_role() = 'owner') with check (public.current_app_role() = 'owner');
create policy "portal_songs_editor_write" on public.portal_songs for all to authenticated
using (public.current_app_role() = 'editor') with check (public.current_app_role() = 'editor');

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'portal_songs_set_updated_at') then
    create trigger portal_songs_set_updated_at before update on public.portal_songs
    for each row execute function public.set_updated_at();
  end if;
end $$;

-- Files attach to a song; null means a project-level file not tied to one song.
alter table public.portal_files add column if not exists song_id uuid references public.portal_songs(id) on delete cascade;
create index if not exists portal_files_song_idx on public.portal_files(song_id);

-- portal_file_approvals used file_id as its primary key — give it a real id so song_id can
-- take over as the natural key instead.
alter table public.portal_file_approvals drop constraint if exists portal_file_approvals_pkey;
alter table public.portal_file_approvals add column if not exists id uuid not null default gen_random_uuid();
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'portal_file_approvals_pkey') then
    alter table public.portal_file_approvals add primary key (id);
  end if;
end $$;

alter table public.portal_file_comments add column if not exists song_id uuid references public.portal_songs(id) on delete cascade;
alter table public.portal_file_approvals add column if not exists song_id uuid references public.portal_songs(id) on delete cascade;

-- Backfill: every existing audio-type file becomes its own song, carrying its metadata
-- across; comments/approvals that referenced that file now point at the new song.
do $$
declare
  rec record;
  new_song_id uuid;
begin
  for rec in select * from public.portal_files where file_type = 'audio' and song_id is null loop
    insert into public.portal_songs (property_id, project_id, title, version_label, bpm, musical_key, preview_audio_path, visible_to_client, created_by, created_at, updated_at)
    values (rec.property_id, rec.project_id, rec.title, rec.version_label, rec.bpm, rec.musical_key, rec.preview_audio_path, rec.visible_to_client, rec.created_by, rec.created_at, rec.updated_at)
    returning id into new_song_id;

    update public.portal_file_comments set song_id = new_song_id where file_id = rec.id;
    update public.portal_file_approvals set song_id = new_song_id where file_id = rec.id;

    -- The old audio-type portal_files row is now redundant — its data lives on the song.
    delete from public.portal_files where id = rec.id;
  end loop;
end $$;

-- song_id fully replaces file_id on these two tables — retire the old column and require
-- every comment/approval to reference a song from here on.
alter table public.portal_file_comments drop column if exists file_id;
alter table public.portal_file_approvals drop column if exists file_id;
alter table public.portal_file_comments alter column song_id set not null;
alter table public.portal_file_approvals alter column song_id set not null;
create unique index if not exists portal_file_approvals_song_unique on public.portal_file_approvals(song_id);
