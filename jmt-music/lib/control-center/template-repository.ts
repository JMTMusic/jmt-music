// Superseded 2026-07-10 by lib/control-center/playbook-repository.ts (Communication
// Playbook build, Phase A). The underlying table was renamed template_library ->
// communication_playbook in the same migration — see supabase/migrations/
// 20260710190000_communication_playbook.sql. This file is kept as an empty module
// (rather than deleted) because this environment cannot reliably delete tracked files;
// it exports nothing and is not imported anywhere in the app.
export {};
