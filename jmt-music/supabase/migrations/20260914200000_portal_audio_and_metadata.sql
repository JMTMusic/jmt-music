-- Client Portal: editable song metadata (BPM/key), a Supabase Storage-backed
-- preview audio path for reliable in-browser streaming (Drive stays the
-- download/master source), and a numeric progress percentage per stage
-- instead of the fixed-60% "in progress" fill.

alter table public.portal_files
  add column if not exists preview_audio_path text,
  add column if not exists bpm text check (bpm is null or char_length(bpm) <= 20),
  add column if not exists musical_key text check (musical_key is null or char_length(musical_key) <= 20);

alter table public.project_portal_stages
  add column if not exists progress_pct integer not null default 0
    check (progress_pct between 0 and 100);
