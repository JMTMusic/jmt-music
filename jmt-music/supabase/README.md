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
8. `migrations/20260710190000_communication_playbook.sql` — renames `template_library` to `communication_playbook` in place (Phase A, Communication Playbook build). Run only after 4–7.
9. `migrations/20260710190100_communication_playbook_seed.sql` — seeds Play 001 ("Artist Introduction & Connection") for `jmt-music`. Run only after 8.

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

## Communication Playbook (migrations 8–9)

Migration 8 renames `template_library` to `communication_playbook` and evolves its columns (`content`→`message_body`, `description`→`purpose`, new `best_used_for`/`variables`/`internal_notes`/`version_number`/`status`/`is_favorite`) plus adds the `communication_playbook_versions` history table. This only touches a table that has never been deployed/seeded in production, so there is no pre-migration data-safety check required the way there was for `clients` — but confirm the table is actually empty first if there's any doubt:

```sql
select count(*) from public.template_library;  -- expect 0, or review rows before proceeding if not
```

Run migration 8 alone, then verify:

```sql
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'communication_playbook'
order by ordinal_position;

select conname, pg_get_constraintdef(oid) from pg_constraint
where conrelid = 'public.communication_playbook'::regclass;
```

Then run migration 9 (seed) and confirm one row:

```sql
select title, category, status, version_number from public.communication_playbook
where property_id = (select id from public.properties where slug = 'jmt-music');
```

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
# Inbound lead system (2026-07-11)

Migration `20260711180000_inbound_lead_system.sql` creates the separate `project_discoveries`, `contact_messages`, and `beat_inquiries` tables, indexes, update triggers, and staff-only RLS policies. It is created locally but must be applied to the configured Supabase project before public submissions can succeed.

Required runtime variables remain `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CONTROL_CENTER_USERNAME`, `CONTROL_CENTER_PASSWORD`, and `CONTROL_CENTER_SUPABASE_USER_ID`. Never expose the service-role key to browser code.

Public entry points are `/start-your-project` and `/contact`; contact links carrying `?beat=...` are stored as Beat Inquiries. Control Center review is at `/control-center/inbox`, with Discoveries, Messages, and Beat Inquiries tabs. New items count toward the dashboard Inbound cards. Status changes and internal notes are staff-only. Discoveries and Beat Inquiries can explicitly create a Client and a universal Project; conversion preserves the inbound record and is guarded by its linked `project_id`.

Submission UUIDs provide idempotency. Project Discovery clears its draft only after a confirmed save and preserves only the first name for the thank-you letter. Contact inputs clear only after success. No client-facing automated email is sent. FormSubmit was the prior contact delivery transport, not a server-side internal notification provider; adding a dedicated provider remains future work.

## Applying and verifying the inbound migration

1. In Supabase, open Project Settings → API. Copy the Project URL to `NEXT_PUBLIC_SUPABASE_URL`, the anonymous key to `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the service-role key to `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. The URL and anonymous key may be used by browser-safe Supabase clients; the service-role key must remain server-only because it bypasses RLS.
2. Open Supabase SQL Editor, create a new query, paste the complete contents of `supabase/migrations/20260711180000_inbound_lead_system.sql`, and run it once.
3. Paste and run `supabase/verification/verify_inbound_lead_system.sql`. It only reads metadata and counts.
4. Restart the local server so environment changes take effect.
5. Follow `docs/inbound-system-verification.md` for public submissions, Inbox review, dashboard counts, duplicate checks, conversion, and RLS checks.

The service-role client is created only in `lib/supabase/admin.ts`, which is marked `server-only`. Inbound access occurs through `lib/inbound/repository.ts` and protected/server actions. Public payloads are rebuilt from an allowlist by `lib/inbound/validation.ts`; status, notes, property, Client, and Project fields are never accepted from browsers. There are no anonymous inbound policies.

Conversion uses the service-role-only `convert_inbound_to_project` database function. It locks the inbound row, reuses an existing same-property Client by normalized email, creates one Project, links and marks the original record, and commits all writes atomically. A retry returns the already-linked Project ID. Contact Messages cannot be converted.

Test cleanup is intentionally manual. First inspect, then optionally run `supabase/verification/cleanup_inbound_test_records.sql`; it targets only inbound rows whose email ends in `@example.test`. It does not remove converted Clients or Projects, which should be reviewed individually in the Control Center before deletion.

## Project Setup schema (2026-07-11, Stage 1 — schema only, revised)

Migration `20260711190000_project_setups.sql` creates `public.project_setups` (Phase Two of the client journey — "how will we build this project together," after Jonathan has reviewed a Project Discovery and decided to move forward). Schema only: no application code, routes, or UI reference this table yet. Apply after `20260711180000_inbound_lead_system.sql`.

**Revised per review before first application:** the table stores `access_token_hash` only — never a raw token. The application layer (not built yet) is responsible for generating the raw private-link token and hashing it before it ever reaches Supabase; do not add that generation code until this schema is approved and applied. `token_created_at`, `token_version`, and `access_revoked_at` support issuing, rotating, and revoking that link over time. `project_id`'s foreign key is `ON DELETE RESTRICT`, not cascade — a Setup is a permanent part of a project's historical business record, so deleting a Project while a Setup still references it will fail loudly rather than silently deleting the Setup. The full lifecycle is now explicit: `sent_at` → `started_at` → `submitted_at` → `confirmed_at`, with `reopened_at` set whenever a submitted/confirmed Setup is reopened for revision.

1. Run `supabase/migrations/20260711190000_project_setups.sql` in the SQL Editor.
2. Run `supabase/verification/verify_project_setups.sql` and confirm: the table and all 19 columns exist; the four RLS policies (staff read, owner all, editor insert, editor update — same posture as every other Growth Engine table) are present; the trigger and two indexes exist; and the `project_id` foreign key's `on_delete` reports `RESTRICT`, not `CASCADE`.
3. No further steps for the schema itself — the private artist-facing route is a later stage. The server-side data layer (Stage 2) is now built; see below.

## Project Setup data layer (2026-07-11, Stage 2 — `lib/project-setup/`)

Server-side only. No routes, no UI, no server actions (`"use server"` files) yet — this stage is the module that a future Control Center action layer and a future public `/project-setup/[token]` route will both call.

**Files:** `types.ts` (internal `ProjectSetupRecord` vs. the trimmed `PublicProjectSetupView` returned to token-authenticated callers), `tokens.ts` (raw token generation + hashing), `validation.ts`, `pipeline.ts` (pure status-transition rules), `repository.ts` (the 10 operations below), plus a `.test.ts` file per module.

**Token model.** The raw private-link token is generated server-side with `crypto.randomBytes(32)` (Node's CSPRNG, base64url-encoded — not `Math.random`, not a sequential id, and deliberately not a v4 UUID, which carries less entropy and visually announces its own format). Only `hashRawToken()`'s SHA-256 hex digest is ever written to `project_setups.access_token_hash`; the raw token is never persisted, never logged, and is returned to the caller exactly once, from `createProjectSetup` or `reissueProjectSetupToken`. If that return value is missed, there is no recovery path other than reissuing — this is intentional, not a gap.

**Revocation and reissue.** `revokeProjectSetupAccess` sets `access_revoked_at` only — it never touches `status`, `responses`, or any other lifecycle field, and a revoked Setup still exists and can be read internally via `getProjectSetupByProjectId`. `reissueProjectSetupToken` generates a brand new raw token, overwrites `access_token_hash` (which is the entire invalidation mechanism — there is only ever one hash stored, so the previous raw token stops matching anything the instant it's overwritten), increments `token_version`, sets a fresh `token_created_at`, and clears `access_revoked_at`. It never touches `responses` or any lifecycle timestamp.

**Lifecycle status rules.** `draft → in_progress` (start) `→ submitted` (submit) `→ confirmed` (confirm), with `reopen` returning either `submitted` or `confirmed` back to `in_progress`. Every transition is checked against an explicit allow-list in `pipeline.ts` (`canPerformAction`) — there is no generic "any status to any status" path. `startProjectSetup` is idempotent from `in_progress` (opening the link again mid-way doesn't error) and only ever sets `started_at` the first time. `saveProjectSetupDraft` writes only the `responses` column — there is no parameter through which a caller could smuggle in a status or protected timestamp — and is rejected once a Setup is `submitted`/`confirmed` (reopen first).

**Authorization split.** `getProjectSetupByProjectId`, `createProjectSetup`, `reissueProjectSetupToken`, `revokeProjectSetupAccess`, `confirmProjectSetup`, and `reopenProjectSetup` are internal — they take a `SiteConfig` and re-validate the Project belongs to that property, matching every other Control Center repository's pattern. Role-gating (`getControlCenterRole()`) is intentionally NOT inside `repository.ts` — consistent with every other repository in this codebase, that check belongs in the `actions.ts` layer that will wrap these functions in Stage 3. `getProjectSetupByRawToken`, `startProjectSetup`, `saveProjectSetupDraft`, and `submitProjectSetup` are public — the token is the entire authorization, and their return type (`PublicProjectSetupResult` / `PublicProjectSetupView`) never includes `internalNotes`, `createdBy`, `discoveryId`, `tokenVersion`, `accessRevokedAt`, or anything hash/token-shaped.

**Only one Setup per Project.** Enforced by the migration's unique constraint on `project_id`. `createProjectSetup` checks for an existing row first and returns it as `{status: "exists"}`; if a concurrent create still races past that check, the database's unique-violation (`23505`) is caught and the existing row is returned the same way — mirroring the exact idempotent-retry pattern `lib/inbound/repository.ts` already uses. An `{status: "exists"}` result never carries a raw token, since none was ever stored; reissue instead if a link needs to be sent again.

**What remains for Stage 3 (not part of this stage):** the internal `app/control-center/*/actions.ts` layer (role-gated wrappers around the internal functions above, e.g. a "Send Project Setup" action on a Project), the public `/project-setup/[token]` route and its UI, and the internal Control Center view of submitted responses. No contracts, payments, uploads, or email automation in any stage yet — those remain explicitly out of scope until named otherwise.

## Project Setup Control Center controls (2026-07-11, Stage 3)

Adds the internal-only Control Center surface for Project Setup. Still no artist-facing `/project-setup/[token]` route, no contracts/payments/uploads/email automation/document generation — those remain out of scope.

**Integration point.** No Project detail page existed before this stage — the Project list (`app/control-center/projects/page.tsx`) is a phase-grouped list only. Rather than overload the list or create a parallel Project surface, this stage adds the smallest reasonable detail page, `app/control-center/projects/[projectId]/page.tsx`, following the exact pattern already established by `app/control-center/growth/leads/[leadId]/page.tsx`. Project titles in the list now link to it.

**Files added:** `app/control-center/projects/[projectId]/page.tsx` (detail page), `app/control-center/projects/setup-actions.ts` (the five role-gated server actions below), `components/control-center/project-setup-panel.tsx` (status display, actions, one-time link reveal, confirmation dialogs), `components/control-center/project-setup-response-review.tsx` (submitted-response display), `lib/project-setup/response-formatter.ts` (pure, tested formatter behind the review component), `lib/project-setup/display.ts` (status labels). `app/control-center/projects/setup-actions.test.ts` is the first server-action-level test in this codebase; `vitest.config.ts`'s `include` was broadened from `lib/**/*.test.ts` to also cover `app/**/*.test.ts` to run it.

**Server actions** (`app/control-center/projects/setup-actions.ts`): `createProjectSetupAction`, `reissueProjectSetupLinkAction`, `revokeProjectSetupAccessAction`, `reopenProjectSetupAction`, `confirmProjectSetupAction`. Every action re-checks `getControlCenterRole()` (owner/editor only — matching every other mutation in this codebase) and resolves the property through `siteRegistry`/`getSiteConfig` before calling the Stage 2 data layer, which independently re-validates the Project belongs to that property. Only `createProjectSetupAction` and `reissueProjectSetupLinkAction` ever return a `rawToken`; every other result (`exists`, `success`, `error`) is structurally incapable of carrying one. A Supabase/data-layer error is only ever surfaced through a hand-written, user-safe message — a migration-hint-shaped repository error is mapped to `"Project Setup is not available until the latest Supabase migration is applied."` rather than shown raw.

**The "no Client" block.** `createProjectSetupAction` is the only action that performs its own extra domain check beyond the data layer: it loads the Project row directly and rejects with `"Link a Client to this Project before creating Project Setup."` if `client_id` is null, without ever auto-creating a Client. This lives at the action layer (not `repository.ts`) since it's a product rule specific to the Control Center's creation flow, not a data-integrity constraint.

**One-time link behavior.** The Project Setup card never displays a raw link except immediately after a `created` or `reissued` action result — held only in React component state, never written to Supabase, `localStorage`, or the page source, and gone the moment the page is refreshed or the callout is dismissed. Reissuing shows a confirmation dialog explaining that the previous link is invalidated the instant a new one is generated.

**Setup card states.** No Setup (blocked with the Client message above, or a "Create Project Setup" button); Draft/In Progress (Reissue Link, Revoke Access); Submitted (Confirm Setup, Reopen Setup, Reissue Link, Revoke Access); Confirmed (Reopen Setup, Reissue Link, Revoke Access). Access-Revoked is displayed as its own badge orthogonal to status (a revoked Setup can be in any status) rather than a separate state — Revoke Access is hidden once already revoked, and Reissue Link is always available to restore access. Reopen shows a confirmation dialog explicitly warning that reopening does not restore access if it was revoked — reissue separately. Confirm shows a confirmation dialog explicitly stating it does not trigger any contract, payment, or phase change.

**Response review.** `lib/project-setup/response-formatter.ts` turns the free-form `responses` jsonb into readable, grouped fields with no raw JSON: keys are humanized on the fly (`artist_name` → "Artist Name"), booleans become Yes/No, empty/null/undefined values are omitted entirely, arrays of scalars become a comma list, arrays of objects fall back to per-item JSON rather than losing data, and nested objects become their own subsection. There is no shared Project Setup question config yet, so every key — including ones that don't exist today — is handled the same generic way; the function accepts an optional `labelOverrides` map so a future config can supply nicer labels without changing its shape or call sites. `completedBy` (client/Jonathan) is shown separately from the responses themselves.

**Missing-schema handling.** If `project_setups` hasn't been migrated yet, `getProjectSetupByProjectId` surfaces the same migration-hint-shaped error the data layer already returns; the Project detail page detects it and renders `"Project Setup is not available until the latest Supabase migration is applied."` instead of crashing or showing a raw error — the rest of the Project page (title, phase, target date, linked Client) still renders normally.

**Tests.** `app/control-center/projects/setup-actions.test.ts` covers: owner/editor allowed, viewer/no-role rejected (and the repository is never called in that case); property scoping (a Project belonging to a different property is rejected); the no-Client block; duplicate create returns `exists` with no `rawToken`; a fresh create returns exactly one `rawToken`; reissue/revoke/reopen/confirm success and error passthrough; the migration-hint-to-friendly-message mapping; and that no non-create/reissue result ever carries a `rawToken`. `lib/project-setup/repository.test.ts` gained one additional case: reopening a revoked, submitted Setup moves its status back to `in_progress` but the old link still resolves as `revoked`, not restored. `lib/project-setup/response-formatter.test.ts` covers strings/numbers/booleans, empty/null/undefined omission, scalar arrays, object arrays, nested sections, unknown/future keys, and `labelOverrides`.

**What remains for Stage 4 (not part of this stage):** the public, token-authenticated `/project-setup/[token]` artist-facing route and its UI (start/save-draft/submit against the already-built public repository functions), and everything still explicitly out of scope — contracts, payments, uploads, email automation, document generation.

## Vitest environment fix: resolving `import "server-only"` (2026-07-11)

On a real Mac checkout, `npm test` reported 99 passing tests with all 14 failures confined to `lib/project-setup/repository.test.ts`, every one failing before any test body ran with `Cannot find package 'server-only'`.

**Root cause.** `server-only` is not an installed npm dependency of this project at all — there is no `node_modules/server-only` and no entry for it in `package.json`/`package-lock.json`. `import "server-only"` still resolves inside `next build` because Next.js vendors its own compiled copy (`node_modules/next/dist/compiled/server-only`) and aliases the bare `server-only` specifier to it inside its own webpack build. Vitest runs modules directly under Node/Vite with no Next.js webpack build in front of it, so that alias doesn't exist there and the bare specifier can't resolve at all — this has nothing to do with the repository module itself, which is exactly why `npm run build` and `npm run typecheck` were both already clean.

**Fix.** `import "server-only";` in `lib/project-setup/repository.ts` (and every other server-boundary module) is untouched — it stays exactly as it was and keeps guarding the production build the same way it always has. Instead:

- `test/stubs/server-only.ts` — a two-line, no-op stub (`export {};`) used only by the test runner. Contains no production logic and is never referenced by `next.config` or any build output.
- `vitest.config.ts` — added a `resolve.alias` entry mapping the bare `"server-only"` specifier to that stub, scoped entirely to Vitest's own config. Production module resolution (`next build`/`next dev`) never looks at this file.

The same audit checked for `client-only` (Next's other sentinel package) — this codebase doesn't import it anywhere, so no matching stub/alias was added for it, per the "don't add unnecessary aliases" instruction.

**Verification.** `npm run typecheck` — clean. `npm test` — this sandbox cannot execute Vitest at all, before or after this fix, for an unrelated, pre-existing reason: `node_modules/rollup` here only has the macOS-built `@rollup/rollup-linux-arm64-gnu`-shaped binary missing (this sandbox's `node_modules` was installed on a Mac and is platform-mismatched on this Linux arm64 box, and there's no network access here to reinstall). This is the same environment limitation reported at the end of Stage 2 and Stage 3 — it is not something this fix could address, since it's one directory below where the `server-only` resolution even matters. `npm run build` was not re-run in this sandbox for the same reason (it already hangs at the dev-server banner in this environment, unrelated to today's change). All three must be run on your Mac to get a real pass/fail; the fix itself only touches test configuration and cannot affect `next build`'s own module resolution.

## Project Setup: the artist-facing flow (2026-07-11, Stage 4)

Adds the private, token-authenticated `/project-setup/[token]` route — the experience an artist uses after Jonathan has already decided to work with them (distinct from Project Discovery's "should we work together?"). Still no contracts, payments, file uploads, email automation, document generation, or client portal beyond this one setup flow.

**Route and privacy.** `app/project-setup/[token]/page.tsx` is a server component with no Basic Auth (`middleware.ts`'s matcher only ever covered `/control-center`, unchanged here) and no public navigation — `components/site-shell.jsx`'s existing pathname check (which already bypasses the public header/nav/footer for `/control-center` and `/start-your-project`) now also bypasses it for `/project-setup`. `app/project-setup/layout.tsx` sets `robots: { index: false, follow: false, nocache: true }`. This project has no `sitemap.ts`/`robots.ts` at all, so there was nothing to add or exclude there. The raw token is validated server-side on every request by hashing it and looking up the matching non-revoked Setup (`getProjectSetupByRawToken`, unchanged from Stage 2) — there is no other authorization mechanism on this route.

**The single generic unavailable state.** A missing token, a malformed token, a revoked token, and an unexpected server/database error (e.g. a missing migration) are all rendered identically by `UnavailableSetup`: *"This Project Setup link is no longer available. Please contact JMT Music for a new link."* An error is logged server-side only (`console.error`, message text only — the data layer's messages are already hand-written and user-safe, and the raw token is never included), never surfaced to the artist. An invalid link is never distinguishable from a revoked or nonexistent one.

**Public data exposed.** Exactly `PublicProjectSetupView` (unchanged since Stage 2): Setup id, status, `responses`, `completedBy`, `startedAt`, `submittedAt`, and the linked Project's id/title/type plus the Client's artist/contact name. Never exposed: `internalNotes`, `discoveryId`, `propertyId`, `tokenVersion`, `accessRevokedAt`, the token hash, `createdBy`, or any other Project/Client/unrelated data — this was already true of the type itself; Stage 4 adds no new fields to it.

**Config-driven architecture.** `lib/project-setup/config.ts` is the single source of truth for both this route and the Control Center's response review: `SetupQuestion`/`SetupSection` data (not one-off components) define every question's key, label, artist-facing prompt, helper text, type (`single_select`/`multi_select`/`textarea`/`text`), optionality, options, and an optional same-screen follow-up question. `SETUP_LABEL_OVERRIDES` is derived automatically from that same list and passed straight into `response-formatter.ts`'s `labelOverrides` parameter from `project-setup-response-review.tsx` — a label is written exactly once, in `config.ts`, and both the artist review screen and the internal Control Center review render it. An empty, documented `SERVICE_SPECIFIC_SECTIONS` map is the named Stage 5 extension point for Production/Mixing/Mastering/Beat/Session-specific questions — nothing renders from it yet, and the artist experience never shows an empty placeholder screen.

**Screens built (Version 1, same flow for every Project type).** Welcome (personalized via the Client's contact name, falling back to the artist name, falling back to a plain "Welcome." if neither exists) → read-only Project Overview (title, service/type, artist name — no editing of Project identity here) → Communication (single-select + optional "best time" follow-up on the same screen) → Timeline (optional textarea) → Availability (single-select) → Creative References (optional textarea, links as plain text, no uploads) → Deliverables (multi-select, explicitly framed as a planning preference, not a locked-in guarantee) → Final Notes (optional textarea) → Review (grouped exactly into Communication / Timeline and Availability / Creative References / Deliverables / Additional Notes, each section independently editable, unanswered optional fields omitted) → Submit. Visual language deliberately mirrors `app/start-your-project/project-intake.module.css`'s stage/choice-card/review-section structure (including its reduced-motion handling) but scopes its own `--accent`/`--accent-bright` custom properties (emerald, not blue) in `setup-flow.module.css` so it reads as the next stage rather than a re-skin of Project Discovery.

**Draft-save behavior.** Chosen approach: save after each completed step, not debounced autosave — explicitly the simpler option the spec permits, and it keeps request volume proportional to real progress rather than keystrokes. Every "Continue" click calls `saveProjectSetupDraftAction` (a thin wrapper around the unchanged `saveProjectSetupDraft`, which writes only the `responses` column) with the full current answer set before advancing; a failure shows an inline, recoverable message and does not advance the step or clear anything the artist typed; success shows a brief "Saved" note. Going "Back" never triggers a save or clears state — the in-memory answers are the only thing Back touches. The raw token is never written to `localStorage`/`sessionStorage`; it already lives in the URL, and resuming later means the artist opening that same link again, not this app duplicating the token into browser storage.

**Status behavior.** Draft → clicking "Begin Setup" calls `beginProjectSetupAction`, which is what actually flips the Setup to `in_progress` and stamps `started_at` — opening the route alone does not. `in_progress` renders the full interactive flow, pre-filled with whatever's already in Supabase (`hydrateAnswers`, in `setup-flow-helpers.ts`). `submitted` and `confirmed` both short-circuit to a static, read-only screen (`renderModeForStatus` — a submitted or confirmed Setup never reaches the interactive branch of `SetupFlow` at all, so there is no code path that could render it editable). A Control-Center reopen flips status back to `in_progress` server-side, which this component requires no special case for — it's simply interactive again, existing responses intact. A revoked link never resolves to a view in the first place (`getProjectSetupByRawToken` rejects revoked rows before returning), so it always renders through the single unavailable state, not a Setup-aware one.

**Submission.** "Send Project Setup" disables itself, calls `submitProjectSetupAction` (saves the latest answers, then submits — `completedBy` is hardcoded to `"client"` server-side and is never accepted as a parameter from the browser), and only flips local state to `submitted` after a successful result. A failure leaves the artist on the review screen with every answer intact, re-enables the button, and shows: *"I'm sorry—your Project Setup could not be sent just yet. Everything you entered is still here. Please try again in a moment."*

**Security.** The raw token is read once from the route param and passed to server actions as a plain function argument — never logged (`grep`-verified no `console.*` calls anywhere in the new client/action files), never written to browser storage, and the token hash/internal metadata never appear in `PublicProjectSetupView`'s serialized shape (test-verified via `JSON.stringify`). `saveProjectSetupDraftAction`/`submitProjectSetupAction` only ever write the `responses` jsonb column — a payload that tries to smuggle in `status`, `completed_by`, or a protected timestamp lands as inert data inside that jsonb blob and never touches the real columns (test-verified). Response size limits are enforced by the unchanged `validateResponses`/`MAX_RESPONSES_JSON_LENGTH` from Stage 2. `saveProjectSetupDraft`/`submitProjectSetup` both reject once a Setup is `submitted`/`confirmed`. No service-role code (`createSupabaseAdminClient`) is imported by `setup-flow.tsx` or any other `"use client"` file in this route — only by `repository.ts`, reached exclusively through the `"use server"` `actions.ts` boundary.

**Missing-migration behavior.** Identical to the single unavailable state above — `getProjectSetupByRawToken` surfaces its existing migration-hint-shaped error, `page.tsx` logs the message server-side only, and the artist sees the same generic "no longer available" copy. Nothing about a missing table ever reaches the page.

**Tests.** `lib/project-setup/config.test.ts` (question/section/label-override integrity). `app/project-setup/[token]/setup-flow-helpers.test.ts` (name fallback, response hydration/resumption including malformed-shape recovery, step mapping, the submitted/confirmed/interactive render-mode guarantee). `app/project-setup/[token]/actions.test.ts` (valid/invalid/revoked token loading, begin-once-and-idempotent, draft save success, response size limit, the protected-fields guarantee, submit-then-locked, reopen-then-editable-again, and no raw token/hash in serialized public data). Two things from the Stage 4 spec's test list are necessarily unit-untestable in this environment rather than skipped by choice: "draft-save failure preserves current client state" and "submission failure stays on review" are React component state behavior, and this codebase's Vitest setup is deliberately scoped to pure logic and server actions only (no jsdom/`@testing-library/react` dependency exists here, and none was added) — both are satisfied by code inspection instead (`setSaveError`/`setSubmitError` only ever set a message string; neither failure path clears or mutates the `answers` state, and `submitting`/`status` are only advanced inside the success branch).

**What remains for Stage 5 (not part of this stage):** service-specific setup sections per Project type (`SERVICE_SPECIFIC_SECTIONS`), and everything still explicitly out of scope — contracts, payments, uploads, email automation, document generation, and any client portal beyond this one setup flow.
