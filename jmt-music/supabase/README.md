# Control Center database migrations

**Corrected 2026-07-10:** this file previously stated these migrations "are not connected to the UI, and they have not been executed." That's no longer accurate and shouldn't be trusted as current — `beat-repository.ts` and `project-repository.ts` actively query the `beats`, `properties`, and `projects` tables in production code today. Whether any individual migration below has actually been run against the live Supabase project is unconfirmed from the repo alone; always run the verification queries for the relevant tables before assuming a migration's effects are live.

## Migration order

Run the files one at a time, in this exact order. Migrations 1–3 are the original Control Center foundation; 4–7 are the Growth Engine Foundation extension (2026-07-10) — do not run 4–7 until the verification block below has been run and reviewed.

1. `migrations/20260705160000_control_center_schema.sql`
2. `migrations/20260705160100_control_center_rls.sql`
3. `migrations/20260705160200_seed_properties.sql`
4. `migrations/20260710160000_growth_engine_clients_extend.sql`
5. `migrations/20260710160100_growth_engine_client_messages_extend.sql`
6. `migrations/20260710160200_growth_engine_template_library.sql`
7. `migrations/20260710160300_growth_engine_document_records.sql`

## Growth Engine Foundation: pre-migration verification (required before running 4–7)

Run this read-only block in the SQL Editor first. It does not modify anything. Review the results against the implementation plan (`Growth Engine Foundation - Implementation Plan (DRAFT).md`) before proceeding — pause and flag back if anything here contradicts what the plan assumes (an unmapped stage value, unexpected columns, or a much larger row count than expected).

```sql
-- 1. Current clients columns
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'clients'
order by ordinal_position;

-- 2. Current stage values and counts
select stage, count(*) from public.clients group by stage order by stage;

-- 3. Current clients row count
select count(*) as clients_row_count from public.clients;

-- 4. Current client_messages row count
select count(*) as client_messages_row_count from public.client_messages;

-- 5. Current contact_submissions row count
select count(*) as contact_submissions_row_count from public.contact_submissions;

-- 6. Existing constraints on clients
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.clients'::regclass;

-- 7. Existing indexes on clients and client_messages
select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename in ('clients', 'client_messages');
```

If the results match what's documented here (5-value stage constraint: `new/contacted/in_progress/completed/archived`; no `artist_name`/`contact_name`/`platform` columns yet), proceed with migrations 4–7 in order, backup first, same procedure as below. If they don't match, stop and review before applying anything.

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

## Growth Engine Foundation procedure (migrations 4–7)

1. Run the pre-migration verification block above first. Confirm results match this document before continuing.
2. Create a database backup from **Database → Backups**.
3. Run migration 4 (`clients` extension) alone, as one query. It is written to be idempotent (`add column if not exists`, guarded `update ... where x is null`) — safe to re-run if it fails partway.
4. Run this verification query and confirm every row still has a valid `stage` and a non-null `artist_name`:

```sql
select stage, is_archived, count(*) from public.clients group by stage, is_archived order by stage;
select count(*) from public.clients where artist_name is null;  -- expect 0
```

5. Run migration 5 (`client_messages` extension), migration 6 (`template_library`), migration 7 (`document_records`), each as its own query, confirming success before moving to the next.
6. In **Table Editor**, confirm `template_library` and `document_records` exist with RLS enabled, and confirm their policies in **Authentication → Policies** (same pattern as `clients`: staff read, owner all, editor insert/update, no anonymous policy).
7. Application code (`client-repository.ts` etc.) has no mock fallback for Growth Engine data — if these tables/columns aren't present yet, reads return status `"error"` with a descriptive detail message and the page renders an empty state, never fabricated leads/communications. There is no strict ordering requirement between "run these migrations" and "deploy the Growth Engine code" as a result, but running the migrations first is the safer direction and is what this project has done for every extension so far.

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
