-- Bugfix: clients.name is still NOT NULL, silently breaking every new lead created
-- through the Add Lead form.
--
-- Root cause: the 2026-07-10 Growth Engine extension
-- (20260710160000_growth_engine_clients_extend.sql) introduced artist_name/contact_name
-- and explicitly deprecated the original `name` column ("Deprecated in favor of
-- artist_name/contact_name. Retained for backward compatibility. Do not write new values
-- here.") — but never relaxed `name`'s original `not null` constraint from
-- 20260705160000_control_center_schema.sql. app/control-center/growth/leads/actions.ts's
-- createLead() correctly follows that deprecation instruction and never sets `name` on
-- insert, which means every new lead created through the Add Lead form violates the
-- still-standing not-null constraint on a column the application was explicitly told not
-- to write to. The generic catch in createLead() then reports this as the unhelpful
-- "The lead could not be created." with no indication of the real cause.
--
-- Corroborating evidence: 20260711180000_inbound_lead_system.sql's server-side
-- convert-Discovery-to-Client function already had to work around this same constraint by
-- explicitly supplying both `name` and `artist_name` in its own insert — proof this gap
-- was already silently affecting one code path and simply hadn't been noticed in the
-- other (the manual Add Lead form) until now.
--
-- Fix: drop the stale not-null constraint. Additive/non-destructive — no data is changed,
-- no rows are affected, and every existing row already has a real `name` value from
-- before the artist_name backfill. Going forward, `name` correctly stays null on every
-- new lead, exactly as the deprecation comment already intended.

alter table public.clients alter column name drop not null;

comment on column public.clients.name is
  'Deprecated in favor of artist_name/contact_name. Retained for backward compatibility only. Do not write new values here — nullable as of 2026-07-12 so new leads (which never populate this column) can actually be created; see 20260712090000_clients_legacy_name_nullable_fix.sql for why this was still blocking inserts.';

-- ---------------------------------------------------------------------------
-- ROLLBACK (manual only — do not run unless reverting this migration)
-- ---------------------------------------------------------------------------
-- Not recommended: reinstating `not null` here would immediately break lead creation
-- again unless createLead()/updateLead() are also changed to populate `name`, which
-- contradicts the column's own documented deprecation. If ever truly needed:
-- update public.clients set name = artist_name where name is null;
-- alter table public.clients alter column name set not null;
