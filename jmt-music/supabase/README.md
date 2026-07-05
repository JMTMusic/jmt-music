# Control Center database migrations

These migrations define the future Control Center database only. They are not connected to the UI, and they have not been executed.

## Migration order

Run the files one at a time in this exact order:

1. `migrations/20260705160000_control_center_schema.sql`
2. `migrations/20260705160100_control_center_rls.sql`
3. `migrations/20260705160200_seed_properties.sql`

## Safe Supabase SQL Editor procedure

1. Open the correct Supabase project and confirm its project name and URL before making changes.
2. If the project already contains data, create a database backup from **Database → Backups** first.
3. Open **SQL Editor** and create a new query named `Control Center 01 - Schema`.
4. Copy only the contents of the first migration into the editor. Review it, then click **Run** once.
5. Confirm the query succeeds. In **Table Editor**, verify the nine new tables exist before continuing.
6. Create a second query named `Control Center 02 - RLS`, paste the second migration, and run it once.
7. Open each new table in **Authentication → Policies** and confirm RLS is enabled and policies are listed.
8. Create a third query named `Control Center 03 - Seed Properties`, paste the seed migration, and run it once.
9. Run this read-only verification query:

```sql
select slug, name, domain, status, is_public
from public.properties
order by slug;
```

Expected result:

- `jmt-music` — active and public
- `jonathan-tripp` — planned and not public

Do not use the **service role key** in SQL text, browser code, screenshots, or client configuration.

## First owner bootstrap

New Supabase Auth users receive the `viewer` role by default. After creating the first administrator in **Authentication → Users**, promote that one known user in SQL Editor:

```sql
update public.profiles
set role = 'owner'
where id = 'PASTE-THE-EXACT-AUTH-USER-UUID-HERE';
```

Before running it, replace the placeholder with the UUID copied from Supabase Auth and verify the intended email. Then confirm:

```sql
select p.id, u.email, p.display_name, p.role
from public.profiles p
join auth.users u on u.id = p.id
where p.id = 'THE-SAME-AUTH-USER-UUID';
```

Do not promote users by email pattern or run an unfiltered role update.

## Policy verification checklist

Use separate test users for each role before connecting the UI:

- Owner can read, create, update, and delete administrative records.
- Editor can read staff data and create/update content, but cannot delete or change dangerous/sensitive settings.
- Viewer can read dashboard data but cannot create, update, or delete records.
- Anonymous requests can read only active properties and published beats, website sections, and explicitly public settings.
- Anonymous requests cannot read clients, messages, submissions, profiles, or activity logs.

Storage setup is intentionally separate. Review [STORAGE.md](./STORAGE.md) before creating buckets or policies.
