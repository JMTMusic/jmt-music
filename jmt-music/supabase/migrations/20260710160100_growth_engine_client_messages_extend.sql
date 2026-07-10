-- Growth Engine Foundation: extend client_messages into the Communication Timeline
-- Additive only. No destructive statements.
-- Repo-wide search (2026-07-10) confirmed zero reads/writes/references to client_messages
-- anywhere in application code — only in this schema/RLS migration history. Safe to extend.

alter table public.client_messages
  add column if not exists type text not null default 'internal_note',
  add column if not exists platform text,
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists source text not null default 'manual',
  add column if not exists updated_at timestamptz not null default now();

comment on column public.client_messages.type is
  'Free text by design (Email, Instagram, Website Inquiry, Fiverr, AirGigs, SoundBetter, Phone Call, Meeting, Proposal, Contract, Invoice, Delivery, Follow-up, Internal Note, ...) — same convention as projects.detail_stage.';
comment on column public.client_messages.source is
  'Origin of the record: manual (default) today. Future automated integrations (gmail, instagram, website_form) write into this same table using this column to distinguish themselves, without changing the core model.';
comment on column public.client_messages.project_id is
  'Optional. A communication belongs to the client relationship first; it may additionally relate to a specific project once one exists.';

create index if not exists client_messages_property_type_idx on public.client_messages(property_id, type, sent_at desc);
create index if not exists client_messages_project_idx on public.client_messages(project_id);

-- Reuses the existing public.set_updated_at() trigger function already used by every other table.
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'client_messages_set_updated_at'
      and tgrelid = 'public.client_messages'::regclass
  ) then
    execute 'create trigger client_messages_set_updated_at before update on public.client_messages for each row execute function public.set_updated_at()';
  end if;
end $$;

-- No RLS policy changes required. The existing policy set already enforces owner-only
-- delete on client_messages by omission: client_messages_owner_all (for all, owner) plus
-- client_messages_editor_insert / client_messages_editor_update exist, but there is no
-- client_messages_editor_delete policy — editors already cannot delete rows at the RLS
-- layer today. This migration relies on that existing behavior rather than adding new policy.

-- ---------------------------------------------------------------------------
-- ROLLBACK (manual only — do not run unless reverting this migration)
-- ---------------------------------------------------------------------------
-- drop trigger if exists client_messages_set_updated_at on public.client_messages;
-- drop index if exists client_messages_property_type_idx;
-- drop index if exists client_messages_project_idx;
-- -- Columns are intentionally left in place even on rollback (non-destructive);
-- -- drop them only as a separate, explicitly reviewed follow-up if truly unwanted:
-- -- alter table public.client_messages drop column if exists type, drop column if exists platform,
-- --   drop column if exists project_id, drop column if exists source, drop column if exists updated_at;
