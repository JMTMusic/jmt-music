-- Client Portal v1: owner-managed Google Drive links with token-gated client access.
-- Files remain in Drive; Supabase stores only project-scoped metadata and feedback.

create table if not exists public.portal_files (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  file_type text not null default 'other'
    check (file_type in ('audio', 'stems', 'artwork', 'document', 'other')),
  version_label text,
  drive_url text not null check (drive_url ~ '^https://(drive|docs)\\.google\\.com/'),
  note text,
  visible_to_client boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portal_file_comments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  file_id uuid not null references public.portal_files(id) on delete cascade,
  author_type text not null check (author_type in ('client', 'staff')),
  author_name text not null check (char_length(author_name) between 1 and 100),
  body text not null check (char_length(body) between 1 and 2000),
  timestamp_seconds integer check (timestamp_seconds is null or timestamp_seconds >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.portal_file_approvals (
  file_id uuid primary key references public.portal_files(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  status text not null check (status in ('approved', 'changes_requested')),
  client_name text not null check (char_length(client_name) between 1 and 100),
  note text check (note is null or char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portal_files_project_created_idx on public.portal_files(project_id, created_at desc);
create index if not exists portal_comments_file_created_idx on public.portal_file_comments(file_id, created_at);
create index if not exists portal_approvals_project_idx on public.portal_file_approvals(project_id);

alter table public.portal_files enable row level security;
alter table public.portal_file_comments enable row level security;
alter table public.portal_file_approvals enable row level security;

-- Browser clients never query these tables directly. Staff access uses the existing
-- server-side role gate; private-link access is validated server-side by token hash.
create policy "portal_files_staff_read" on public.portal_files for select to authenticated
using (public.current_app_role() in ('owner', 'editor', 'viewer'));
create policy "portal_files_owner_all" on public.portal_files for all to authenticated
using (public.current_app_role() = 'owner') with check (public.current_app_role() = 'owner');
create policy "portal_files_editor_write" on public.portal_files for all to authenticated
using (public.current_app_role() = 'editor') with check (public.current_app_role() = 'editor');

create policy "portal_comments_staff_read" on public.portal_file_comments for select to authenticated
using (public.current_app_role() in ('owner', 'editor', 'viewer'));
create policy "portal_comments_staff_write" on public.portal_file_comments for all to authenticated
using (public.current_app_role() in ('owner', 'editor')) with check (public.current_app_role() in ('owner', 'editor'));

create policy "portal_approvals_staff_read" on public.portal_file_approvals for select to authenticated
using (public.current_app_role() in ('owner', 'editor', 'viewer'));
create policy "portal_approvals_staff_write" on public.portal_file_approvals for all to authenticated
using (public.current_app_role() in ('owner', 'editor')) with check (public.current_app_role() in ('owner', 'editor'));

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'portal_files_set_updated_at') then
    create trigger portal_files_set_updated_at before update on public.portal_files
    for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'portal_approvals_set_updated_at') then
    create trigger portal_approvals_set_updated_at before update on public.portal_file_approvals
    for each row execute function public.set_updated_at();
  end if;
end $$;
