-- Growth Engine Foundation: Template Library
-- New table. Additive only.

create table if not exists public.template_library (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  category text not null,
  title text not null,
  content text not null,
  tags text[] not null default '{}'::text[],
  description text,
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.template_library is
  'Manually authored reusable text. Supports {{variable}} placeholders as a documented convention only — not parsed or auto-filled. No AI generation.';
comment on column public.template_library.category is
  'Free text by design (Instagram, Email, Fiverr, AirGigs, SoundBetter, Proposal, Contract, Delivery, Review Request, Follow-up, ...).';

create index if not exists template_library_property_category_idx on public.template_library(property_id, category, sort_order);
create index if not exists template_library_property_archived_idx on public.template_library(property_id, is_archived);

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'template_library_set_updated_at'
      and tgrelid = 'public.template_library'::regclass
  ) then
    execute 'create trigger template_library_set_updated_at before update on public.template_library for each row execute function public.set_updated_at()';
  end if;
end $$;

alter table public.template_library enable row level security;

-- No anonymous policy — internal only, same posture as clients/client_messages/projects.
create policy "template_library_staff_read"
on public.template_library for select to authenticated
using (public.current_app_role() in ('owner', 'editor', 'viewer'));

create policy "template_library_owner_all"
on public.template_library for all to authenticated
using (public.current_app_role() = 'owner')
with check (public.current_app_role() = 'owner');

create policy "template_library_editor_insert"
on public.template_library for insert to authenticated
with check (public.current_app_role() = 'editor');

create policy "template_library_editor_update"
on public.template_library for update to authenticated
using (public.current_app_role() = 'editor')
with check (public.current_app_role() = 'editor');

-- ---------------------------------------------------------------------------
-- ROLLBACK (manual only — do not run unless reverting this migration)
-- ---------------------------------------------------------------------------
-- drop table if exists public.template_library;
-- (Safe: this is a new table introduced by this migration; nothing else references it.)
