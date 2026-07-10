-- JMT Music Control Center: projects table (JMT OS v1 foundation)
-- Additive migration only. No destructive statements are included.
-- This is the internal workflow spine approved in the Producer Workspace
-- architecture: every active piece of work (a beat in production, a client
-- job, a sync pitch, a website initiative, a content batch) is represented
-- here. It has no public exposure and no effect on the live website.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  type text not null
    check (type in ('beat', 'client_work', 'sync', 'website', 'content', 'other')),
  title text not null,
  phase text not null default 'not_started'
    check (phase in ('not_started', 'in_progress', 'finishing', 'ready', 'done')),
  detail_stage text,
  stage_changed_at timestamptz not null default now(),
  client_id uuid references public.clients(id) on delete set null,
  beat_id uuid references public.beats(id) on delete set null,
  target_date date,
  is_waiting boolean not null default false,
  waiting_note text,
  waiting_since timestamptz,
  next_action_override text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_property_phase_idx
  on public.projects(property_id, phase, stage_changed_at);
create index if not exists projects_property_waiting_idx
  on public.projects(property_id, is_waiting);
create index if not exists projects_client_idx
  on public.projects(client_id);
create index if not exists projects_beat_idx
  on public.projects(beat_id);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'projects_set_updated_at'
      and tgrelid = 'public.projects'::regclass
  ) then
    execute
      'create trigger projects_set_updated_at
       before update on public.projects
       for each row execute function public.set_updated_at()';
  end if;
end $$;

alter table public.projects enable row level security;

-- Projects are internal only. There is no anonymous or public read policy,
-- unlike beats and website_sections.
create policy "projects_staff_read"
on public.projects for select to authenticated
using (public.current_app_role() in ('owner', 'editor', 'viewer'));

create policy "projects_owner_all"
on public.projects for all to authenticated
using (public.current_app_role() = 'owner')
with check (public.current_app_role() = 'owner');

create policy "projects_editor_insert"
on public.projects for insert to authenticated
with check (public.current_app_role() = 'editor');

create policy "projects_editor_update"
on public.projects for update to authenticated
using (public.current_app_role() = 'editor')
with check (public.current_app_role() = 'editor');
