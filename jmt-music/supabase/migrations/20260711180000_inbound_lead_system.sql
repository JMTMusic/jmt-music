-- JMT Music inbound lead system: three intentionally separate workflows.
-- Public submissions use trusted server actions with the service role; no anon policies exist.

create table if not exists public.project_discoveries (
  id uuid primary key default gen_random_uuid(), property_id uuid not null references public.properties(id) on delete cascade,
  submission_token uuid not null unique, first_name text not null, artist_name text, has_artist_name boolean not null default false,
  email text not null, phone text, project_type text not null, vision text not null, inspiration text not null,
  current_stage text not null, timeline text not null, additional_notes text,
  status text not null default 'new' check (status in ('new','reviewing','follow_up_needed','accepted','referred','declined','converted')),
  submitted_at timestamptz not null default now(), reviewed_at timestamptz, internal_notes text,
  client_id uuid references public.clients(id) on delete set null, project_id uuid references public.projects(id) on delete set null,
  converted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(), property_id uuid not null references public.properties(id) on delete cascade,
  submission_token uuid not null unique, name text not null, email text not null, phone text, subject text, message text not null,
  status text not null default 'new' check (status in ('new','open','awaiting_reply','resolved','archived')),
  submitted_at timestamptz not null default now(), reviewed_at timestamptz, internal_notes text,
  client_id uuid references public.clients(id) on delete set null, project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.beat_inquiries (
  id uuid primary key default gen_random_uuid(), property_id uuid not null references public.properties(id) on delete cascade,
  submission_token uuid not null unique, name text not null, artist_name text, email text not null, phone text,
  beat_id uuid references public.beats(id) on delete set null, beat_slug text, beat_title text, beat_url text,
  license_interest text, intended_use text, message text not null,
  status text not null default 'new' check (status in ('new','reviewing','follow_up_needed','quoted','licensed','converted','closed')),
  submitted_at timestamptz not null default now(), reviewed_at timestamptz, internal_notes text,
  client_id uuid references public.clients(id) on delete set null, project_id uuid references public.projects(id) on delete set null,
  converted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index if not exists project_discoveries_scope_idx on public.project_discoveries(property_id,status,submitted_at desc);
create index if not exists project_discoveries_email_idx on public.project_discoveries(property_id,email);
create index if not exists project_discoveries_client_idx on public.project_discoveries(client_id);
create index if not exists project_discoveries_project_idx on public.project_discoveries(project_id);
create index if not exists contact_messages_scope_idx on public.contact_messages(property_id,status,submitted_at desc);
create index if not exists contact_messages_email_idx on public.contact_messages(property_id,email);
create index if not exists contact_messages_client_idx on public.contact_messages(client_id);
create index if not exists contact_messages_project_idx on public.contact_messages(project_id);
create index if not exists beat_inquiries_scope_idx on public.beat_inquiries(property_id,status,submitted_at desc);
create index if not exists beat_inquiries_email_idx on public.beat_inquiries(property_id,email);
create index if not exists beat_inquiries_beat_idx on public.beat_inquiries(property_id,beat_id,beat_slug);
create index if not exists beat_inquiries_client_idx on public.beat_inquiries(client_id);
create index if not exists beat_inquiries_project_idx on public.beat_inquiries(project_id);

do $$ declare t text; begin
  foreach t in array array['project_discoveries','contact_messages','beat_inquiries'] loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', t, t);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I_staff_read on public.%I for select to authenticated using (public.current_app_role() in (''owner'',''editor'',''viewer''))', t, t);
    execute format('create policy %I_owner_all on public.%I for all to authenticated using (public.current_app_role() = ''owner'') with check (public.current_app_role() = ''owner'')', t, t);
    execute format('create policy %I_editor_update on public.%I for update to authenticated using (public.current_app_role() = ''editor'') with check (public.current_app_role() = ''editor'')', t, t);
  end loop;
end $$;

-- Atomic, idempotent conversion. The row lock prevents concurrent retries from
-- creating duplicate Projects; all writes roll back together on failure.
create or replace function public.convert_inbound_to_project(p_kind text, p_inbound_id uuid, p_property_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare r jsonb; v_client uuid; v_project uuid; v_email text; v_label text; v_type text; v_title text; v_next text;
begin
  if p_kind = 'discoveries' then select to_jsonb(x) into r from public.project_discoveries x where id=p_inbound_id and property_id=p_property_id for update;
  elsif p_kind = 'beat-inquiries' then select to_jsonb(x) into r from public.beat_inquiries x where id=p_inbound_id and property_id=p_property_id for update;
  else raise exception 'Unsupported inbound kind'; end if;
  if r is null then raise exception 'Inbound record not found'; end if;
  if nullif(r->>'project_id','') is not null then return (r->>'project_id')::uuid; end if;
  v_email=lower(trim(r->>'email')); v_label=coalesce(nullif(r->>'artist_name',''),nullif(r->>'first_name',''),nullif(r->>'name',''),'New artist');
  select id into v_client from public.clients where property_id=p_property_id and lower(email)=v_email order by created_at limit 1;
  if v_client is null then insert into public.clients(property_id,name,artist_name,contact_name,email,phone,project_type,stage,source)
    values(p_property_id,v_label,v_label,coalesce(r->>'first_name',r->>'name'),v_email,nullif(r->>'phone',''),coalesce(r->>'project_type','Beat Licensing'),'new_lead',p_kind) returning id into v_client; end if;
  if p_kind='discoveries' then v_type='client_work';v_title=v_label||' — '||(r->>'project_type');v_next='Prepare and send Project Setup invitation';
  else v_type='beat';v_title=v_label||' — '||(r->>'beat_title');v_next='Discuss license and next steps';end if;
  insert into public.projects(property_id,type,title,phase,client_id,beat_id,next_action_override)
    values(p_property_id,v_type,v_title,'not_started',v_client,nullif(r->>'beat_id','')::uuid,v_next) returning id into v_project;
  if p_kind='discoveries' then update public.project_discoveries set client_id=v_client,project_id=v_project,status='converted',converted_at=now(),reviewed_at=coalesce(reviewed_at,now()) where id=p_inbound_id;
  else update public.beat_inquiries set client_id=v_client,project_id=v_project,status='converted',converted_at=now(),reviewed_at=coalesce(reviewed_at,now()) where id=p_inbound_id;end if;
  return v_project;
end $$;
revoke all on function public.convert_inbound_to_project(text,uuid,uuid) from public, anon, authenticated;
grant execute on function public.convert_inbound_to_project(text,uuid,uuid) to service_role;
