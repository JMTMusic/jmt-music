-- JMT Music Control Center: Row Level Security

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

revoke all on function public.current_app_role() from public;
grant execute on function public.current_app_role() to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.beats enable row level security;
alter table public.website_sections enable row level security;
alter table public.clients enable row level security;
alter table public.client_messages enable row level security;
alter table public.contact_submissions enable row level security;
alter table public.site_settings enable row level security;
alter table public.activity_log enable row level security;

-- Profiles: users can read themselves; owners administer all profiles.
create policy "profiles_read_self"
on public.profiles for select to authenticated
using (id = auth.uid());

create policy "profiles_owner_read_all"
on public.profiles for select to authenticated
using (public.current_app_role() = 'owner');

create policy "profiles_owner_insert"
on public.profiles for insert to authenticated
with check (public.current_app_role() = 'owner');

create policy "profiles_owner_update"
on public.profiles for update to authenticated
using (public.current_app_role() = 'owner')
with check (public.current_app_role() = 'owner');

create policy "profiles_owner_delete"
on public.profiles for delete to authenticated
using (public.current_app_role() = 'owner');

-- Properties: public reads active public properties; staff reads all.
create policy "properties_public_read"
on public.properties for select to anon, authenticated
using (is_public and status = 'active');

create policy "properties_staff_read"
on public.properties for select to authenticated
using (public.current_app_role() in ('owner', 'editor', 'viewer'));

create policy "properties_owner_insert"
on public.properties for insert to authenticated
with check (public.current_app_role() = 'owner');

create policy "properties_owner_update"
on public.properties for update to authenticated
using (public.current_app_role() = 'owner')
with check (public.current_app_role() = 'owner');

create policy "properties_owner_delete"
on public.properties for delete to authenticated
using (public.current_app_role() = 'owner');

-- Beats: published rows are public. Editors manage content without delete access.
create policy "beats_public_read_published"
on public.beats for select to anon, authenticated
using (
  published and exists (
    select 1 from public.properties p
    where p.id = property_id and p.is_public and p.status = 'active'
  )
);

create policy "beats_staff_read"
on public.beats for select to authenticated
using (public.current_app_role() in ('owner', 'editor', 'viewer'));

create policy "beats_owner_all"
on public.beats for all to authenticated
using (public.current_app_role() = 'owner')
with check (public.current_app_role() = 'owner');

create policy "beats_editor_insert"
on public.beats for insert to authenticated
with check (public.current_app_role() = 'editor');

create policy "beats_editor_update"
on public.beats for update to authenticated
using (public.current_app_role() = 'editor')
with check (public.current_app_role() = 'editor');

-- Website sections: only published sections are public.
create policy "website_sections_public_read_published"
on public.website_sections for select to anon, authenticated
using (
  published and exists (
    select 1 from public.properties p
    where p.id = property_id and p.is_public and p.status = 'active'
  )
);

create policy "website_sections_staff_read"
on public.website_sections for select to authenticated
using (public.current_app_role() in ('owner', 'editor', 'viewer'));

create policy "website_sections_owner_all"
on public.website_sections for all to authenticated
using (public.current_app_role() = 'owner')
with check (public.current_app_role() = 'owner');

create policy "website_sections_editor_insert"
on public.website_sections for insert to authenticated
with check (public.current_app_role() = 'editor');

create policy "website_sections_editor_update"
on public.website_sections for update to authenticated
using (public.current_app_role() = 'editor')
with check (public.current_app_role() = 'editor');

-- Clients, messages, and submissions: no anonymous access.
create policy "clients_staff_read"
on public.clients for select to authenticated
using (public.current_app_role() in ('owner', 'editor', 'viewer'));

create policy "clients_owner_all"
on public.clients for all to authenticated
using (public.current_app_role() = 'owner')
with check (public.current_app_role() = 'owner');

create policy "clients_editor_insert"
on public.clients for insert to authenticated
with check (public.current_app_role() = 'editor');

create policy "clients_editor_update"
on public.clients for update to authenticated
using (public.current_app_role() = 'editor')
with check (public.current_app_role() = 'editor');

create policy "client_messages_staff_read"
on public.client_messages for select to authenticated
using (public.current_app_role() in ('owner', 'editor', 'viewer'));

create policy "client_messages_owner_all"
on public.client_messages for all to authenticated
using (public.current_app_role() = 'owner')
with check (public.current_app_role() = 'owner');

create policy "client_messages_editor_insert"
on public.client_messages for insert to authenticated
with check (public.current_app_role() = 'editor');

create policy "client_messages_editor_update"
on public.client_messages for update to authenticated
using (public.current_app_role() = 'editor')
with check (public.current_app_role() = 'editor');

create policy "contact_submissions_staff_read"
on public.contact_submissions for select to authenticated
using (public.current_app_role() in ('owner', 'editor', 'viewer'));

create policy "contact_submissions_owner_all"
on public.contact_submissions for all to authenticated
using (public.current_app_role() = 'owner')
with check (public.current_app_role() = 'owner');

create policy "contact_submissions_editor_update"
on public.contact_submissions for update to authenticated
using (public.current_app_role() = 'editor')
with check (public.current_app_role() = 'editor');

-- Settings: public reads explicitly public values. Editors cannot touch dangerous
-- or sensitive settings. Viewers can read only non-sensitive values.
create policy "site_settings_public_read"
on public.site_settings for select to anon, authenticated
using (
  is_public and not is_sensitive and exists (
    select 1 from public.properties p
    where p.id = property_id and p.is_public and p.status = 'active'
  )
);

create policy "site_settings_owner_all"
on public.site_settings for all to authenticated
using (public.current_app_role() = 'owner')
with check (public.current_app_role() = 'owner');

create policy "site_settings_staff_read_safe"
on public.site_settings for select to authenticated
using (
  public.current_app_role() in ('editor', 'viewer')
  and not is_sensitive
);

create policy "site_settings_editor_insert_safe"
on public.site_settings for insert to authenticated
with check (
  public.current_app_role() = 'editor'
  and not is_sensitive
  and not is_dangerous
);

create policy "site_settings_editor_update_safe"
on public.site_settings for update to authenticated
using (
  public.current_app_role() = 'editor'
  and not is_sensitive
  and not is_dangerous
)
with check (
  public.current_app_role() = 'editor'
  and not is_sensitive
  and not is_dangerous
);

-- Activity is readable by all staff. Owners manage all records; authenticated
-- editors can append only events attributed to their own account.
create policy "activity_log_staff_read"
on public.activity_log for select to authenticated
using (public.current_app_role() in ('owner', 'editor', 'viewer'));

create policy "activity_log_owner_all"
on public.activity_log for all to authenticated
using (public.current_app_role() = 'owner')
with check (public.current_app_role() = 'owner');

create policy "activity_log_editor_insert_own"
on public.activity_log for insert to authenticated
with check (
  public.current_app_role() = 'editor'
  and actor_user_id = auth.uid()
);
