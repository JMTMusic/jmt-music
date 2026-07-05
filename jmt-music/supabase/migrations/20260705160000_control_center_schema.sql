-- JMT Music Control Center: foundational schema
-- Additive migration only. No destructive statements are included.

create extension if not exists pgcrypto;

do $$
begin
  create type public.app_role as enum ('owner', 'editor', 'viewer');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role public.app_role not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  domain text not null unique,
  focus text not null,
  status text not null default 'planned' check (status in ('planned', 'active', 'paused')),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.beats (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  genre text,
  bpm integer check (bpm between 1 and 400),
  musical_key text,
  release_date date,
  artwork_path text,
  audio_path text,
  beatstars_url text,
  featured boolean not null default false,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, slug)
);

create table if not exists public.website_sections (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  section_key text not null,
  title text not null,
  content jsonb not null default '{}'::jsonb,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, section_key)
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  project_type text,
  budget text,
  stage text not null default 'new'
    check (stage in ('new', 'contacted', 'in_progress', 'completed', 'archived')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound', 'internal')),
  subject text,
  body text not null,
  sent_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  email text not null,
  project_type text,
  timeline text,
  budget text,
  message text not null,
  status text not null default 'new'
    check (status in ('new', 'reviewed', 'converted', 'spam', 'archived')),
  source text,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  setting_key text not null,
  value jsonb not null default '{}'::jsonb,
  description text,
  is_public boolean not null default false,
  is_sensitive boolean not null default false,
  is_dangerous boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, setting_key),
  check (not (is_public and is_sensitive))
);

create table if not exists public.activity_log (
  id bigint generated always as identity primary key,
  property_id uuid references public.properties(id) on delete set null,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists beats_property_published_idx
  on public.beats(property_id, published, sort_order);
create index if not exists website_sections_property_published_idx
  on public.website_sections(property_id, published, sort_order);
create index if not exists clients_property_stage_idx
  on public.clients(property_id, stage, updated_at desc);
create index if not exists client_messages_client_sent_idx
  on public.client_messages(client_id, sent_at desc);
create index if not exists contact_submissions_property_status_idx
  on public.contact_submissions(property_id, status, submitted_at desc);
create index if not exists site_settings_property_key_idx
  on public.site_settings(property_id, setting_key);
create index if not exists activity_log_property_created_idx
  on public.activity_log(property_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
  trigger_name text;
begin
  foreach table_name in array array[
    'profiles',
    'properties',
    'beats',
    'website_sections',
    'clients',
    'contact_submissions',
    'site_settings'
  ]
  loop
    trigger_name := table_name || '_set_updated_at';
    if not exists (
      select 1
      from pg_trigger
      where tgname = trigger_name
        and tgrelid = format('public.%I', table_name)::regclass
    ) then
      execute format(
        'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
        trigger_name,
        table_name
      );
    end if;
  end loop;
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email),
    'viewer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'on_control_center_auth_user_created'
      and tgrelid = 'auth.users'::regclass
  ) then
    execute
      'create trigger on_control_center_auth_user_created
       after insert on auth.users
       for each row execute function public.handle_new_user()';
  end if;
end $$;
