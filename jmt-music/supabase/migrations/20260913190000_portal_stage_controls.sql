create table if not exists public.project_portal_stages (
  project_id uuid not null references public.projects(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  stage text not null check (stage in ('production','mixing','mastering','delivery')),
  status text not null default 'not_started' check (status in ('not_started','in_progress','ready','complete')),
  client_note text check (client_note is null or char_length(client_note) <= 500),
  updated_at timestamptz not null default now(),
  primary key (project_id, stage)
);

alter table public.project_portal_stages enable row level security;
create policy "portal_stages_staff_read" on public.project_portal_stages for select to authenticated
using (public.current_app_role() in ('owner','editor','viewer'));
create policy "portal_stages_staff_write" on public.project_portal_stages for all to authenticated
using (public.current_app_role() in ('owner','editor')) with check (public.current_app_role() in ('owner','editor'));

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'portal_stages_set_updated_at') then
    create trigger portal_stages_set_updated_at before update on public.project_portal_stages
    for each row execute function public.set_updated_at();
  end if;
end $$;
