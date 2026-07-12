# Inbound system verification checklist

Use this checklist after the Supabase project is ready. Use test addresses ending in `@example.test` so they are easy to identify and remove.

## Set up

- [ ] Add `NEXT_PUBLIC_SUPABASE_URL` to `.env.local` from Supabase → Project Settings → API. This URL is safe for the browser.
- [ ] Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the same API page. This key is safe for the browser when Row Level Security is enabled.
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` from the same page. Keep this server-only and never paste it into browser code or screenshots.
- [ ] Confirm the existing Control Center variables are present: `CONTROL_CENTER_USERNAME`, `CONTROL_CENTER_PASSWORD`, and `CONTROL_CENTER_SUPABASE_USER_ID`.
- [ ] In Supabase SQL Editor, paste and run `supabase/migrations/20260711180000_inbound_lead_system.sql`.
- [ ] Run `supabase/verification/verify_inbound_lead_system.sql` and confirm every expected object is listed.
- [ ] Stop and restart the development server.

## Public submissions

- [ ] Submit one Project Discovery using `discovery@example.test`.
- [ ] Confirm the button waits for success before opening the Project Discovery thank-you page.
- [ ] Submit one normal Contact Message using `message@example.test`.
- [ ] Open a beat’s “Inquire to License” link and submit using `beat@example.test`.
- [ ] Confirm the beat title and slug were filled from the selected beat rather than typed manually.
- [ ] Temporarily stop the server or remove a local Supabase value, retry a draft, and confirm the page shows a calm error without losing the entered information. Restore the value afterward.

## Control Center

- [ ] Open `/control-center/inbox` and confirm the Discovery appears only under Discoveries.
- [ ] Confirm the general message appears only under Messages.
- [ ] Confirm the beat request appears only under Beat Inquiries with its beat context.
- [ ] Confirm the dashboard shows one new item in each inbound count.
- [ ] Change each item out of `new` and confirm its dashboard count drops.
- [ ] Add and save a private internal note on each item.
- [ ] Confirm internal notes do not appear anywhere on the public site.

## Conversion safety

- [ ] Convert the test Discovery to a Client and Project.
- [ ] Confirm one Client and one Project were created and the Discovery remains preserved as `converted`.
- [ ] Repeat the conversion action and confirm no second Client or Project appears.
- [ ] Convert the Beat Inquiry and repeat the same duplicate check.
- [ ] Confirm Contact Messages offer no conversion action.

## Privacy and finishing checks

- [ ] Open `/start-your-project/thank-you` after clearing the stored thank-you name and confirm it says “Thank You.”
- [ ] Confirm an anonymous Supabase API request cannot select, update, or delete any inbound table.
- [ ] Confirm the Project Discovery, Contact, Beats, homepage, and Control Center visual design remains unchanged.
- [ ] When finished, review `supabase/verification/cleanup_inbound_test_records.sql`, then run it manually only if the listed `@example.test` rows are safe to delete.
