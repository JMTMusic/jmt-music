# JMT OS handoff — Cowork to Claude Code

This document captures everything decided in the Cowork session that produced the JMT OS v1 architecture, so implementation can continue in Claude Code without re-deriving context. Read this before writing any code.

## Repo facts

- Git repo root: `/Users/jonathanmichaeltrippjr/Desktop/AI/JMTMusic-GitHub` (note: this is one level *above* the app).
- App lives in the `jmt-music` subfolder of that repo — `package.json`, `app/`, `lib/`, `components/`, `supabase/` are all there.
- Remote: `origin` → `https://github.com/JMTMusic/jmt-music.git`, branch `main`, confirmed clean and in sync with GitHub.
- Stack: Next.js 15 (App Router), React 19, Tailwind 4, Supabase (Postgres + Storage), deployed on Vercel.
- Migrations are applied manually via the Supabase SQL Editor, one at a time — see `supabase/README.md`. This project does not use the Supabase CLI or `supabase db push`; there's no `supabase/config.toml`.

## Known open issues (not part of this build, but relevant context)

1. **The Control Center's website CMS publish flow doesn't reliably reach the live site.** Traced to the runtime path between Supabase and the rendered page (`lib/public-cms.ts`'s `readPublishedSections()` silently swallows all errors and falls back to hardcoded copy). Narrowed to three unconfirmed candidates: a Supabase project-ref mismatch between Vercel Production and the dashboard being edited in, the Production `SUPABASE_SERVICE_ROLE_KEY` actually being the anon key, or the `jmtmusic.studio` domain being pinned to a stale Vercel deployment instead of tracking Production. Jonathan was going to verify these three manually. **Status unconfirmed — do not assume this is fixed.**
2. **The public `/beats` page reads from `tracks.json`, not the Supabase `beats` table.** The Control Center's beat `published` flag has no effect on the live site today. This is a deliberately deferred future task ("connect the public beats page to Supabase"), not part of the current build.

Neither of these should block or be touched by the Projects work below — they're flagged so they aren't mistaken for solved or forgotten.

## Approved architecture: JMT OS v1

Direction: this is no longer "a Beat Workspace." It's the operating system for the whole business, built around one question on login: **what should I work on today?**

**Modules** (not pages): Dashboard, Projects, Beats, Clients, Website, Content, Analytics, Settings. Content and Settings exist in nav but aren't part of this build phase.

**Core model decision:** stage/workflow tracking belongs on a new `Project` entity, not on `Beat`. `Beat` stays a pure catalog/asset record (title, audio, artwork, BPM, key, BeatStars link). `Project` is the transient workflow record (what's being actively worked on right now) and can optionally reference a `client_id` and/or `beat_id`. This is deliberate: it's what makes one Dashboard query answer "what needs attention" across beats, client work, sync, website, and content without five separate pipelines.

**UX is frozen.** Do not redesign modules unless a genuine functional issue is discovered during implementation — this was explicitly approved after two mockup iterations. High-fidelity mockups were reviewed and approved in the Cowork session (not saved as files — described here instead):

- **Dashboard**, top to bottom: Today's Focus (things Jonathan needs to act on) → Waiting On (things blocked on someone/something else — clients, a photographer, etc.) → a lightweight workload meter (active project count against a comfortable ceiling, broken down by type) → Business Snapshot (the metrics: beat plays, BeatStars clicks, production inquiries, sync page views).
- **Projects**: the master, unfiltered list of every active project across all types, grouped by phase (Not started / In progress / Finishing / Ready / Done), filterable by type via chips.
- **Beats**: leaned toward a pure music library — search, sort, genre filter, mood tags from `tracks.json`. Workflow was deliberately removed from this module; it only shows a single pointer row ("N beats in production → Projects") linking out, not an embedded pipeline.
- **Clients**: relationship list with stage pills (New/In progress/Completed), each tied to their linked Projects.
- **Website**: existing CMS flow, with an explicit "internal flag, not yet connected to the live site" caption preserved near publish controls — do not remove this caption or imply publishing is live until open issue #1 above is resolved.
- **Analytics**: read-only reporting, unchanged in spirit from what exists today.

**Stage color legend**, used consistently everywhere a phase/status pill appears: gray = not started, blue = in progress, amber = finishing, purple = ready, green = done. Keep this mapping consistent across Projects, Beats, and Clients.

## Data model: `public.projects`

Migration file: `supabase/migrations/20260709150000_create_projects.sql` — **created, not yet confirmed applied to Supabase.** Verify before writing any code that queries this table:

```sql
select column_name from information_schema.columns where table_name = 'projects';
```

If that returns nothing, the migration needs to be run in the Supabase SQL Editor first (see `supabase/README.md` for the manual procedure this project follows).

Full migration content:

```sql
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

-- trigger reuses existing public.set_updated_at(), RLS is staff-only
-- (owner/editor/viewer via public.current_app_role()), no anonymous policy.
-- See the migration file for the full trigger + policy statements.
```

**Deliberate design decisions — do not "fix" these without discussion:**

- `type` and `phase` are `check` constraints on plain text, not a lookup table. Adding a 7th project type later requires a migration (`drop constraint` / `add constraint`), not just an insert. Accepted trade-off for v1 simplicity.
- `detail_stage` is intentionally unconstrained free text (not an enum) — type-specific stage vocabulary (e.g. beat: "mixing"; client_work: whatever fits) can evolve without a schema change.
- **No uniqueness constraint on `beat_id`.** Multiple projects may reference the same beat simultaneously (e.g. a `client_work` project for a custom edit and a `content` project for a promo post about the same track). This was explicitly decided, not an oversight — do not add a unique/partial-unique index on `beat_id` without revisiting with real usage data first.
- `client_id`/`beat_id`/`created_by` use `on delete set null`, not cascade — deleting a client or beat shouldn't destroy project history.
- Also deleted in this session: `supabase/migrations/20260709140000_beat_pipeline_stage.sql` (an earlier draft that added `stage` to `beats` directly). It was never applied to Supabase and directly contradicted this architecture. It's gone — don't recreate it.

## Remaining build order (smallest safe increments)

1. ~~Migration: create `projects` table + RLS~~ — done, pending Supabase confirmation (see above).
2. Extend `lib/control-center/types.ts` with `Project`, `ProjectType`, `ProjectPhase`. Add `lib/control-center/project-repository.ts`: one base read function (`getPropertyProjects`) plus derived in-memory selectors for Today's Focus, Waiting On, and Workload — avoid separate round-trips for each.
3. Build `lib/control-center/project-pipeline.ts`: pure, unit-testable functions for next-action text, staleness, and workload-zone calculation, generalized across project types (not beat-specific).
4. Add `app/control-center/projects/actions.ts`: `createProject`, `updateProjectPhase`, `setProjectWaiting`. Follow the exact role-gated (`getControlCenterRole()`), property-scoped (`siteRegistry` lookup by slug) pattern used in every existing action file — see `app/control-center/beats/actions.ts` and `app/control-center/website/actions.ts` as the reference implementations.
5. Build the Projects module page (`app/control-center/projects/page.tsx` + components) matching the approved mockup. Add "Projects" to the nav array in `components/control-center/admin-shell.tsx`.
6. Rebuild `app/control-center/page.tsx` (Dashboard) into the four approved sections, backed by step 2's selectors.
7. Add the single "N beats in production → Projects" pointer row to `app/control-center/beats/page.tsx` (a count query against `projects` where `type = 'beat'` and `phase != 'done'`) — no other changes to the Beats module.

Each step should be independently testable and revertable. None of this should touch the public website (`app/page.jsx`, `app/beats/page.jsx`, etc.) or the CMS publish path (`lib/public-cms.ts`, `app/control-center/website/actions.ts`).

## Conventions already established — follow these, don't reinvent

- Server actions: `"use server"`, validate input, check `getControlCenterRole()` before any write, scope every query by `property_id` looked up from `siteRegistry`, `revalidatePath(...)` after mutation.
- Repository functions: `"server-only"`, wrap in try/catch, return a typed result with a `status`/`source` discriminator rather than throwing — see `lib/control-center/beat-repository.ts`.
- UI primitives already exist in `components/control-center/ui.tsx`: `AdminCard`, `SectionHeading`, `PageHeader`, `StatusRow`, `ActionButton`, `EmptyState`, `LoadingState`. Reuse these rather than building new ones.
- Supabase clients: `createSupabaseAdminClient()` (service role, bypasses RLS, server-only) is what every Control Center read/write uses today — see `lib/supabase/admin.ts`.
