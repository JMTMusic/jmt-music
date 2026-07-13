-- Communication Playbook: seed the "Artist Appreciation Outreach" message library.
-- Additive only. Idempotent — each insert is guarded by a not-exists check on the exact
-- title, same convention as 20260710190100_communication_playbook_seed.sql. No schema
-- changes: every row below fits the existing communication_playbook shape as-is
-- (category/title/purpose/best_used_for/message_body/variables/internal_notes/tags/
-- sort_order) — no new table, no new columns, no new component.
--
-- Shape: one "guide" Play (title exactly "Artist Appreciation Outreach") whose
-- internal_notes carries the framework — core principle, outreach rule, recommended
-- process, the One-Observation Rule, the intent guide, and the Do Not Send guardrails —
-- plus thirteen ready-to-copy message Plays, one per message in the approved library.
-- All fourteen share category='outreach' and are tagged 'Artist Appreciation' so they
-- browse and search together in the existing Playbook UI; each message Play additionally
-- carries its own intent tag (General Appreciation, Song-Specific, Vocal Appreciation,
-- Songwriting, Production, Instrumentalists, New Release Congratulations, Continued
-- Support, After They Reply) matching the intent guide in the parent Play's internal
-- notes. sort_order 1-14 places the whole library immediately after the existing
-- "Artist Introduction & Connection" Play (sort_order 0) within the Outreach section.
--
-- No message here was written or altered by AI — every message_body below is exactly the
-- approved wording provided for this library (the two Song-Specific Plays with a song
-- reference use the existing {{variable}} convention -- {{song_title}} -- in place of the
-- approved [Song Title] bracket, matching how {{artist_name}} is already used in the
-- Artist Introduction & Connection seed; wording is otherwise unchanged).

-- 1. Guide Play — the framework, not a message to send.
insert into public.communication_playbook (
  property_id, category, title, purpose, best_used_for, message_body, variables,
  internal_notes, tags, version_number, status, sort_order
)
select
  p.id,
  'outreach',
  'Artist Appreciation Outreach',
  $purpose$Build genuine artist relationships through thoughtful, personalized appreciation messages—with no pitch, ask, or sales pressure in the first contact.$purpose$,
  array[]::text[],
  $message_body$This Play is a reference guide, not a message to send. See Internal Notes for the full framework: the core principle, the outreach rule, the recommended process, the One-Observation Rule, the intent guide, and the Do Not Send guardrails.

Ready-to-copy starter messages live in the other Plays below, all tagged "Artist Appreciation."$message_body$,
  array[]::text[],
  $internal_notes$CORE PRINCIPLE
The artist should walk away feeling genuinely encouraged, even if they never reply.

OUTREACH RULE
Every first message must:
- Be sincere
- Contain no sales pitch
- Contain no request
- Avoid introducing JMT Music as a service
- Include at least one observation that could only come from actually listening
- Be written or adjusted by Jonathan before it is sent

This message library exists to prevent blank-page friction, not to automate authenticity.

RECOMMENDED PROCESS
1. Listen to the artist's music.
2. Identify what genuinely stood out.
3. Choose the closest message starter (see the tagged Plays below).
4. Add one artist-specific observation.
5. Read the message once to ensure it sounds natural.
6. Send it with no pitch or expectation of a reply.
7. Record the outreach in the artist relationship system.

THE ONE-OBSERVATION RULE
Before sending any message, add one sentence that proves you genuinely listened.

Examples:
- The harmonies in the bridge were beautiful.
- That piano intro immediately hooked me.
- Your newest release has such a warm, nostalgic feel.
- I love how intimate your vocal sounds.
- The chorus has been stuck in my head all afternoon.
- The acoustic guitar tone on that song is gorgeous.
- The way the song builds into the final chorus was really satisfying.

Too generic: "Love your music."
Personalized: "The piano that comes in during the second verse of [Song Title] caught me off guard—in the best way."

INTENT GUIDE — what stood out?
- I liked their overall sound -> General Appreciation
- One song grabbed me -> Song-Specific
- Their voice stood out -> Vocal Appreciation
- Their lyrics connected with me -> Songwriting
- The production impressed me -> Production
- Their playing stood out -> Instrumentalists
- They released something new -> New Release Congratulations
- We have interacted before -> Continued Support

DO NOT SEND
- Copying and pasting the exact same message to many artists
- Complimenting music that was not actually listened to
- Asking them to hire JMT Music in the first message
- Sending links, portfolios, prices, or service information immediately
- Pretending there is "no agenda" while hiding a pitch in the same message
- Overloading the message with production criticism or unsolicited advice
- Sending multiple follow-ups when the artist has not replied$internal_notes$,
  array['Artist Appreciation', 'Guide', 'Guardrails'],
  1,
  'active',
  1
from public.properties p
where p.slug = 'jmt-music'
  and not exists (
    select 1 from public.communication_playbook cp
    where cp.property_id = p.id and cp.title = 'Artist Appreciation Outreach'
  );

-- 2. General Appreciation — Simple Appreciation
insert into public.communication_playbook (
  property_id, category, title, purpose, best_used_for, message_body, variables,
  tags, version_number, status, sort_order
)
select
  p.id,
  'outreach',
  'General Appreciation — Simple Appreciation',
  $purpose$Use when: I liked their overall sound and there's no one specific song or element to point to yet.$purpose$,
  array['Instagram DM', 'Facebook Message'],
  $message_body$Hey! I came across your music today and just wanted to say I really enjoyed listening. You have a really unique sound. Keep making music!$message_body$,
  array[]::text[],
  array['General Appreciation', 'Artist Appreciation'],
  1,
  'active',
  2
from public.properties p
where p.slug = 'jmt-music'
  and not exists (
    select 1 from public.communication_playbook cp
    where cp.property_id = p.id and cp.title = 'General Appreciation — Simple Appreciation'
  );

-- 3. General Appreciation — New Fan
insert into public.communication_playbook (
  property_id, category, title, purpose, best_used_for, message_body, variables,
  tags, version_number, status, sort_order
)
select
  p.id,
  'outreach',
  'General Appreciation — New Fan',
  $purpose$Use when: I liked their overall sound. A slightly warmer variant of Simple Appreciation.$purpose$,
  array['Instagram DM', 'Facebook Message'],
  $message_body$Hey! I found your page today and spent some time listening. Just wanted to let you know you've got a new fan. Looking forward to hearing more from you.$message_body$,
  array[]::text[],
  array['General Appreciation', 'Artist Appreciation'],
  1,
  'active',
  3
from public.properties p
where p.slug = 'jmt-music'
  and not exists (
    select 1 from public.communication_playbook cp
    where cp.property_id = p.id and cp.title = 'General Appreciation — New Fan'
  );

-- 4. General Appreciation — No Agenda
insert into public.communication_playbook (
  property_id, category, title, purpose, best_used_for, message_body, variables,
  internal_notes, tags, version_number, status, sort_order
)
select
  p.id,
  'outreach',
  'General Appreciation — No Agenda',
  $purpose$Use when: I liked their overall sound and want to make the no-pitch intent explicit.$purpose$,
  array['Instagram DM', 'Facebook Message'],
  $message_body$Hey! I don't need anything—I just wanted to tell you I really enjoyed your music. Wishing you nothing but the best with your next release.$message_body$,
  array[]::text[],
  $internal_notes$Only send this one if it's actually true — never pair "no agenda" with a hidden pitch in the same message or a follow-up right after.$internal_notes$,
  array['General Appreciation', 'Artist Appreciation'],
  1,
  'active',
  4
from public.properties p
where p.slug = 'jmt-music'
  and not exists (
    select 1 from public.communication_playbook cp
    where cp.property_id = p.id and cp.title = 'General Appreciation — No Agenda'
  );

-- 5. Song-Specific — Atmosphere
insert into public.communication_playbook (
  property_id, category, title, purpose, best_used_for, message_body, variables,
  tags, version_number, status, sort_order
)
select
  p.id,
  'outreach',
  'Song-Specific — Atmosphere',
  $purpose$Use when: one song grabbed me specifically. Replace {{song_title}} and add a real observation before sending — see the One-Observation Rule in the parent guide.$purpose$,
  array['Instagram DM', 'Facebook Message'],
  $message_body$Hey! I was listening to {{song_title}} today and really loved it. The atmosphere you created throughout the track was beautiful. Just wanted to tell you how much I enjoyed it.$message_body$,
  array['song_title'],
  array['Song-Specific', 'Artist Appreciation'],
  1,
  'active',
  5
from public.properties p
where p.slug = 'jmt-music'
  and not exists (
    select 1 from public.communication_playbook cp
    where cp.property_id = p.id and cp.title = 'Song-Specific — Atmosphere'
  );

-- 6. Song-Specific — On Repeat
insert into public.communication_playbook (
  property_id, category, title, purpose, best_used_for, message_body, variables,
  tags, version_number, status, sort_order
)
select
  p.id,
  'outreach',
  'Song-Specific — On Repeat',
  $purpose$Use when: one song grabbed me specifically, especially a recent release.$purpose$,
  array['Instagram DM', 'Facebook Message'],
  $message_body$Your latest release has been on repeat today. Really great work—thanks for putting it out into the world.$message_body$,
  array[]::text[],
  array['Song-Specific', 'Artist Appreciation'],
  1,
  'active',
  6
from public.properties p
where p.slug = 'jmt-music'
  and not exists (
    select 1 from public.communication_playbook cp
    where cp.property_id = p.id and cp.title = 'Song-Specific — On Repeat'
  );

-- 7. Vocal Appreciation — New Fan Listening
insert into public.communication_playbook (
  property_id, category, title, purpose, best_used_for, message_body, variables,
  tags, version_number, status, sort_order
)
select
  p.id,
  'outreach',
  'Vocal Appreciation — New Fan Listening',
  $purpose$Use when: their voice stood out.$purpose$,
  array['Instagram DM', 'Facebook Message'],
  $message_body$I just wanted to say your voice is incredible. I came across your page today and spent some time listening. You've got something really special.$message_body$,
  array[]::text[],
  array['Vocal Appreciation', 'Artist Appreciation'],
  1,
  'active',
  7
from public.properties p
where p.slug = 'jmt-music'
  and not exists (
    select 1 from public.communication_playbook cp
    where cp.property_id = p.id and cp.title = 'Vocal Appreciation — New Fan Listening'
  );

-- 8. Vocal Appreciation — Emotional Vocals
insert into public.communication_playbook (
  property_id, category, title, purpose, best_used_for, message_body, variables,
  tags, version_number, status, sort_order
)
select
  p.id,
  'outreach',
  'Vocal Appreciation — Emotional Vocals',
  $purpose$Use when: their voice stood out, particularly the emotional delivery.$purpose$,
  array['Instagram DM', 'Facebook Message'],
  $message_body$The emotion in your vocals really stood out to me. Just wanted to stop by and say I genuinely enjoyed listening.$message_body$,
  array[]::text[],
  array['Vocal Appreciation', 'Artist Appreciation'],
  1,
  'active',
  8
from public.properties p
where p.slug = 'jmt-music'
  and not exists (
    select 1 from public.communication_playbook cp
    where cp.property_id = p.id and cp.title = 'Vocal Appreciation — Emotional Vocals'
  );

-- 9. Songwriting — Honest Writing
insert into public.communication_playbook (
  property_id, category, title, purpose, best_used_for, message_body, variables,
  tags, version_number, status, sort_order
)
select
  p.id,
  'outreach',
  'Songwriting — Honest Writing',
  $purpose$Use when: their lyrics or songwriting connected with me.$purpose$,
  array['Instagram DM', 'Facebook Message'],
  $message_body$I really admire your songwriting. There's something really honest about the way you write that connected with me. Just wanted to say thanks for sharing your music.$message_body$,
  array[]::text[],
  array['Songwriting', 'Artist Appreciation'],
  1,
  'active',
  9
from public.properties p
where p.slug = 'jmt-music'
  and not exists (
    select 1 from public.communication_playbook cp
    where cp.property_id = p.id and cp.title = 'Songwriting — Honest Writing'
  );

-- 10. Production — Intentional Work
insert into public.communication_playbook (
  property_id, category, title, purpose, best_used_for, message_body, variables,
  tags, version_number, status, sort_order
)
select
  p.id,
  'outreach',
  'Production — Intentional Work',
  $purpose$Use when: the production impressed me.$purpose$,
  array['Instagram DM', 'Facebook Message'],
  $message_body$I really enjoyed the production on your latest track. Everything felt really intentional. Great work!$message_body$,
  array[]::text[],
  array['Production', 'Artist Appreciation'],
  1,
  'active',
  10
from public.properties p
where p.slug = 'jmt-music'
  and not exists (
    select 1 from public.communication_playbook cp
    where cp.property_id = p.id and cp.title = 'Production — Intentional Work'
  );

-- 11. Instrumentalists — Beautiful Touch
insert into public.communication_playbook (
  property_id, category, title, purpose, best_used_for, message_body, variables,
  tags, version_number, status, sort_order
)
select
  p.id,
  'outreach',
  'Instrumentalists — Beautiful Touch',
  $purpose$Use when: their playing or performance stood out.$purpose$,
  array['Instagram DM', 'Facebook Message'],
  $message_body$Just wanted to say I really enjoyed your playing. You have a beautiful touch on your instrument. Looking forward to hearing more.$message_body$,
  array[]::text[],
  array['Instrumentalists', 'Artist Appreciation'],
  1,
  'active',
  11
from public.properties p
where p.slug = 'jmt-music'
  and not exists (
    select 1 from public.communication_playbook cp
    where cp.property_id = p.id and cp.title = 'Instrumentalists — Beautiful Touch'
  );

-- 12. New Release Congratulations
insert into public.communication_playbook (
  property_id, category, title, purpose, best_used_for, message_body, variables,
  tags, version_number, status, sort_order
)
select
  p.id,
  'outreach',
  'New Release Congratulations',
  $purpose$Use when: they released something new.$purpose$,
  array['Instagram DM', 'Facebook Message'],
  $message_body$Congrats on the new release! Just wanted to let you know I really enjoyed listening. Hope it's everything you were hoping it'd be.$message_body$,
  array[]::text[],
  array['New Release Congratulations', 'Artist Appreciation'],
  1,
  'active',
  12
from public.properties p
where p.slug = 'jmt-music'
  and not exists (
    select 1 from public.communication_playbook cp
    where cp.property_id = p.id and cp.title = 'New Release Congratulations'
  );

-- 13. Continued Support
insert into public.communication_playbook (
  property_id, category, title, purpose, best_used_for, message_body, variables,
  tags, version_number, status, sort_order
)
select
  p.id,
  'outreach',
  'Continued Support',
  $purpose$Use when: we have interacted before — following their growth over time.$purpose$,
  array['Instagram DM', 'Facebook Message', 'Networking'],
  $message_body$Just wanted to say it's been really cool watching your music continue to grow over the last few months. Keep going—you've got something special.$message_body$,
  array[]::text[],
  array['Continued Support', 'Artist Appreciation'],
  1,
  'active',
  13
from public.properties p
where p.slug = 'jmt-music'
  and not exists (
    select 1 from public.communication_playbook cp
    where cp.property_id = p.id and cp.title = 'Continued Support'
  );

-- 14. After They Reply
insert into public.communication_playbook (
  property_id, category, title, purpose, best_used_for, message_body, variables,
  internal_notes, tags, version_number, status, sort_order
)
select
  p.id,
  'outreach',
  'After They Reply',
  $purpose$Use when: the artist has replied to a first-contact message.$purpose$,
  array['Instagram DM', 'Facebook Message'],
  $message_body$Thanks so much for replying! I really appreciate it. I always enjoy discovering artists who genuinely care about their craft, and your music definitely stood out to me.$message_body$,
  array[]::text[],
  $internal_notes$This is still not the moment to force a pitch. The conversation should develop naturally.$internal_notes$,
  array['After They Reply', 'Artist Appreciation'],
  1,
  'active',
  14
from public.properties p
where p.slug = 'jmt-music'
  and not exists (
    select 1 from public.communication_playbook cp
    where cp.property_id = p.id and cp.title = 'After They Reply'
  );

-- ---------------------------------------------------------------------------
-- ROLLBACK (manual only — do not run unless reverting this migration)
-- ---------------------------------------------------------------------------
-- delete from public.communication_playbook
-- where property_id = (select id from public.properties where slug = 'jmt-music')
--   and title in (
--     'Artist Appreciation Outreach',
--     'General Appreciation — Simple Appreciation',
--     'General Appreciation — New Fan',
--     'General Appreciation — No Agenda',
--     'Song-Specific — Atmosphere',
--     'Song-Specific — On Repeat',
--     'Vocal Appreciation — New Fan Listening',
--     'Vocal Appreciation — Emotional Vocals',
--     'Songwriting — Honest Writing',
--     'Production — Intentional Work',
--     'Instrumentalists — Beautiful Touch',
--     'New Release Congratulations',
--     'Continued Support',
--     'After They Reply'
--   );
