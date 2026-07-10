-- Growth Engine Foundation: Document Center (metadata only)
-- New table. Additive only.

create table if not exists public.document_records (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  type text not null
    check (type in (
      'proposal', 'production_agreement', 'mixing_agreement', 'mastering_agreement',
      'beat_license', 'session_agreement', 'invoice', 'welcome_packet', 'project_checklist'
    )),
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'signed', 'paid', 'void')),
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  notes text,
  external_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.document_records is
  'Metadata and external links only. No document generation, PDF rendering, or e-signature capability exists here or is implied. No contract language stored or referenced here should be treated as legally approved.';
comment on column public.document_records.status is
  'Manually recorded, not externally verified. A status of signed or paid reflects what staff entered, not a system-confirmed signature or payment.';
comment on column public.document_records.external_url is
  'Optional pointer to where the real file actually lives (e.g. Google Drive). This table never stores or generates the document itself.';

-- type is a check constraint (unlike platform/category elsewhere) because this is a
-- deliberate, bounded legal/business taxonomy explicitly enumerated by the business owner,
-- not an open-ended, organically-growing vocabulary like platform or template category.

create index if not exists document_records_property_client_idx on public.document_records(property_id, client_id);
create index if not exists document_records_property_status_idx on public.document_records(property_id, status);
create index if not exists document_records_project_idx on public.document_records(project_id);

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'document_records_set_updated_at'
      and tgrelid = 'public.document_records'::regclass
  ) then
    execute 'create trigger document_records_set_updated_at before update on public.document_records for each row execute function public.set_updated_at()';
  end if;
end $$;

alter table public.document_records enable row level security;

create policy "document_records_staff_read"
on public.document_records for select to authenticated
using (public.current_app_role() in ('owner', 'editor', 'viewer'));

create policy "document_records_owner_all"
on public.document_records for all to authenticated
using (public.current_app_role() = 'owner')
with check (public.current_app_role() = 'owner');

create policy "document_records_editor_insert"
on public.document_records for insert to authenticated
with check (public.current_app_role() = 'editor');

create policy "document_records_editor_update"
on public.document_records for update to authenticated
using (public.current_app_role() = 'editor')
with check (public.current_app_role() = 'editor');

-- ---------------------------------------------------------------------------
-- ROLLBACK (manual only — do not run unless reverting this migration)
-- ---------------------------------------------------------------------------
-- drop table if exists public.document_records;
-- (Safe: this is a new table introduced by this migration; nothing else references it.)
