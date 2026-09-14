-- Fix the Google Drive URL check from the original Client Portal migration.
-- With standard_conforming_strings enabled, the original `\\.` pattern looked
-- for a literal backslash instead of escaping the hostname dots.

alter table public.portal_files
  drop constraint if exists portal_files_drive_url_check;

alter table public.portal_files
  add constraint portal_files_drive_url_check
  check (drive_url ~ '^https://(drive|docs)\.google\.com/');
