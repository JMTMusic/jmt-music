-- Communication Playbook: expand "Artist Appreciation Outreach" with a second section,
-- "Introducing JMT Music" — how to naturally tell an artist about Jonathan/JMT Music once
-- they've replied and a genuine conversation has begun. Additive only, no schema changes.
--
-- Two parts, mirroring 20260713120000_artist_appreciation_outreach_seed.sql exactly:
--   1. Appends the new section to the guide Play's internal_notes (same Play, same title —
--      this is an expansion of the existing entry, not a new one), following the exact
--      snapshot-before-update convention app/control-center/growth/playbook/actions.ts's
--      updatePlay already uses: the pre-update row is copied into
--      communication_playbook_versions first, then version_number is bumped, so the
--      Play's own Version History (already rendered on its detail page) shows this
--      expansion as a real, visible edit rather than a silent overwrite.
--   2. Ten new ready-to-copy message Plays, one per message in the approved "Introducing
--      JMT Music" library, tagged 'Introducing JMT Music' + 'Artist Appreciation' so they
--      browse/search alongside the existing appreciation messages.
--
-- Idempotent: the internal_notes append/version-snapshot only runs if the marker text
-- isn't already present; each new message Play is guarded by the same not-exists-on-title
-- check used throughout this project's seed migrations.

-- 1a. Snapshot the pre-expansion state before it's overwritten.
insert into public.communication_playbook_versions (
  playbook_id, version_number, title, purpose, message_body, variables, internal_notes, changed_by
)
select cp.id, cp.version_number, cp.title, cp.purpose, cp.message_body, cp.variables, cp.internal_notes, null
from public.communication_playbook cp
join public.properties p on p.id = cp.property_id
where p.slug = 'jmt-music'
  and cp.title = 'Artist Appreciation Outreach'
  and cp.internal_notes not like '%INTRODUCING JMT MUSIC%';

-- 1b. Append the new section and bump the version marker.
update public.communication_playbook cp
set internal_notes = cp.internal_notes || $section$

INTRODUCING JMT MUSIC
How to naturally tell an artist about Jonathan and JMT Music once they've replied and a genuine conversation has begun.

CORE RULE
Introduce JMT Music as context for who you are — not as the hidden reason you complimented them.

The first appreciation message must remain completely separate from the business introduction. Do not send the introduction unless the artist replies or the conversation naturally creates an opening.

WHEN TO INTRODUCE JMT MUSIC
Appropriate moments include:
- The artist asks what Jonathan does
- The artist asks how Jonathan found their music
- The conversation turns toward production, songwriting, recording, or collaboration
- The artist mentions needing help with an upcoming song or project
- There has been enough genuine conversation that sharing more about Jonathan feels natural

Do not introduce JMT Music simply because the artist replied "thank you."

RECOMMENDED PROGRESSION
1. Send a genuine appreciation message.
2. Artist replies.
3. Continue the conversation naturally.
4. Learn about the artist and their current work.
5. Introduce Jonathan and JMT Music when relevant.
6. Discuss a creative idea or need.
7. Share work or the website if requested or appropriate.
8. Move toward a call, demo review, or opportunity only when mutual interest exists.

PERSONALIZATION REQUIREMENT
Every JMT Music introduction should connect to the actual conversation. Avoid transitions that could be sent to any artist without modification.

Examples:
- "Since you mentioned wanting a fuller sound for the next single..."
- "What you said about struggling to finish the arrangement is actually a big part of what I help artists with."
- "Your voice over the kind of warm, organic production you described could be really special."
- "I especially connected with what you said about wanting the music to stay intimate."

TONE GUARDRAILS
The introduction should feel:
- Confident, but not aggressive
- Professional, but still human
- Interested in the artist, not just the sale
- Collaborative rather than transactional
- Clear about what JMT Music does
- Free of artificial urgency or pressure

THE WEBSITE
Only share https://www.jmtmusic.studio/ when: the artist asks for more information, expresses interest in working together, asks to hear Jonathan's work, or the conversation has clearly moved toward a possible collaboration. Never send the website as part of the original appreciation message. See the "Sharing the Website" Play below.

DO NOT SEND
- Immediate bait-and-switch: "Glad you replied! I run a production company. Here are my rates."
- Generic sales transition: "Thanks! By the way, do you need a producer?"
- Premature portfolio link: "Love your song! Check out my website."
- Unsolicited criticism: "Your music is good, but the production needs work. I could fix it."
- False urgency: "I only have two production slots left this month."
- Overexplaining: sending a long biography, full service list, pricing information, portfolio links, and booking instructions all at once.

Ready-to-copy starter messages for this section are tagged "Introducing JMT Music" below.

RELATIONSHIP-FIRST PRINCIPLE
The goal is not to turn every reply into a sale. The goal is to discover whether there is genuine creative alignment. A project should emerge from the relationship — not replace it.$section$,
    version_number = cp.version_number + 1,
    updated_at = now()
from public.properties p
where cp.property_id = p.id
  and p.slug = 'jmt-music'
  and cp.title = 'Artist Appreciation Outreach'
  and cp.internal_notes not like '%INTRODUCING JMT MUSIC%';

-- 2. When They Ask What You Do
insert into public.communication_playbook (
  property_id, category, title, purpose, best_used_for, message_body, variables,
  tags, version_number, status, sort_order
)
select
  p.id,
  'outreach',
  'When They Ask What You Do',
  $purpose$Use when: the artist directly asks what Jonathan does.$purpose$,
  array['Instagram DM', 'Facebook Message'],
  $message_body$Of course! I'm a producer, pianist, and the founder of JMT Music. I work with artists on production, arrangement, mixing, and bringing their ideas to life. I'm an artist and musician first, though, so I genuinely enjoy finding and supporting great music.$message_body$,
  array[]::text[],
  array['Introducing JMT Music', 'Artist Appreciation'],
  1,
  'active',
  15
from public.properties p
where p.slug = 'jmt-music'
  and not exists (
    select 1 from public.communication_playbook cp
    where cp.property_id = p.id and cp.title = 'When They Ask What You Do'
  );

-- 3. Short and Casual
insert into public.communication_playbook (
  property_id, category, title, purpose, best_used_for, message_body, variables,
  tags, version_number, status, sort_order
)
select
  p.id,
  'outreach',
  'Short and Casual',
  $purpose$Use when: a shorter, more casual way of introducing what Jonathan does.$purpose$,
  array['Instagram DM', 'Facebook Message'],
  $message_body$I'm a producer and pianist, and I run a small production company called JMT Music. I help artists develop and produce their songs, but I also just really enjoy connecting with other musicians and hearing what they're creating.$message_body$,
  array[]::text[],
  array['Introducing JMT Music', 'Artist Appreciation'],
  1,
  'active',
  16
from public.properties p
where p.slug = 'jmt-music'
  and not exists (
    select 1 from public.communication_playbook cp
    where cp.property_id = p.id and cp.title = 'Short and Casual'
  );

-- 4. Conversation Turns Toward Music Production
insert into public.communication_playbook (
  property_id, category, title, purpose, best_used_for, message_body, variables,
  tags, version_number, status, sort_order
)
select
  p.id,
  'outreach',
  'Conversation Turns Toward Music Production',
  $purpose$Use when: the conversation turns toward production, songwriting, recording, or collaboration on its own.$purpose$,
  array['Instagram DM', 'Facebook Message'],
  $message_body$That's actually a big part of what I do through JMT Music. I work with artists on production and arrangement, helping them take an idea or demo and shape it into the sound they're imagining.$message_body$,
  array[]::text[],
  array['Introducing JMT Music', 'Artist Appreciation'],
  1,
  'active',
  17
from public.properties p
where p.slug = 'jmt-music'
  and not exists (
    select 1 from public.communication_playbook cp
    where cp.property_id = p.id and cp.title = 'Conversation Turns Toward Music Production'
  );

-- 5. When Their Music Inspires a Production Idea
insert into public.communication_playbook (
  property_id, category, title, purpose, best_used_for, message_body, variables,
  internal_notes, tags, version_number, status, sort_order
)
select
  p.id,
  'outreach',
  'When Their Music Inspires a Production Idea',
  $purpose$Use when: Jonathan has a genuine, specific creative idea sparked by their music.$purpose$,
  array['Instagram DM', 'Facebook Message'],
  $message_body$Listening to your music actually gave me a few production ideas. I run JMT Music, where I produce and develop songs with artists. No pressure at all—I just think your voice and writing could sound incredible with the right production around them.$message_body$,
  array[]::text[],
  $internal_notes$Only use this when there is a real, specific creative idea — never as a generic transition into selling services.$internal_notes$,
  array['Introducing JMT Music', 'Artist Appreciation'],
  1,
  'active',
  18
from public.properties p
where p.slug = 'jmt-music'
  and not exists (
    select 1 from public.communication_playbook cp
    where cp.property_id = p.id and cp.title = 'When Their Music Inspires a Production Idea'
  );

-- 6. When They Mention an Upcoming Project
insert into public.communication_playbook (
  property_id, category, title, purpose, best_used_for, message_body, variables,
  tags, version_number, status, sort_order
)
select
  p.id,
  'outreach',
  'When They Mention an Upcoming Project',
  $purpose$Use when: the artist mentions needing help with an upcoming song or project.$purpose$,
  array['Instagram DM', 'Facebook Message'],
  $message_body$That sounds exciting. I'd genuinely love to hear more about what you're working on. I run JMT Music and help artists with production, arrangement, mixing, and developing their songs, so this is very much the kind of work I care about.$message_body$,
  array[]::text[],
  array['Introducing JMT Music', 'Artist Appreciation'],
  1,
  'active',
  19
from public.properties p
where p.slug = 'jmt-music'
  and not exists (
    select 1 from public.communication_playbook cp
    where cp.property_id = p.id and cp.title = 'When They Mention an Upcoming Project'
  );

-- 7. Gentle Collaboration Opening
insert into public.communication_playbook (
  property_id, category, title, purpose, best_used_for, message_body, variables,
  tags, version_number, status, sort_order
)
select
  p.id,
  'outreach',
  'Gentle Collaboration Opening',
  $purpose$Use when: there's been enough genuine conversation that a soft, low-pressure collaboration opening feels natural.$purpose$,
  array['Instagram DM', 'Facebook Message'],
  $message_body$I've really enjoyed talking with you and listening to your work. I run JMT Music, and I'd definitely be open to exploring something together at some point if it ever feels like the right fit.$message_body$,
  array[]::text[],
  array['Introducing JMT Music', 'Artist Appreciation'],
  1,
  'active',
  20
from public.properties p
where p.slug = 'jmt-music'
  and not exists (
    select 1 from public.communication_playbook cp
    where cp.property_id = p.id and cp.title = 'Gentle Collaboration Opening'
  );

-- 8. Direct but Low-Pressure Invitation
insert into public.communication_playbook (
  property_id, category, title, purpose, best_used_for, message_body, variables,
  tags, version_number, status, sort_order
)
select
  p.id,
  'outreach',
  'Direct but Low-Pressure Invitation',
  $purpose$Use when: a slightly more direct invitation feels appropriate, while still staying low-pressure.$purpose$,
  array['Instagram DM', 'Facebook Message'],
  $message_body$I really love what you're doing. I produce through JMT Music, and I think there could be something creatively interesting for us to make together. There's absolutely no pressure, but I'd be happy to talk through ideas sometime.$message_body$,
  array[]::text[],
  array['Introducing JMT Music', 'Artist Appreciation'],
  1,
  'active',
  21
from public.properties p
where p.slug = 'jmt-music'
  and not exists (
    select 1 from public.communication_playbook cp
    where cp.property_id = p.id and cp.title = 'Direct but Low-Pressure Invitation'
  );

-- 9. Offering to Listen to a Demo
insert into public.communication_playbook (
  property_id, category, title, purpose, best_used_for, message_body, variables,
  tags, version_number, status, sort_order
)
select
  p.id,
  'outreach',
  'Offering to Listen to a Demo',
  $purpose$Use when: offering to listen to a demo or work-in-progress, without a formal pitch.$purpose$,
  array['Instagram DM', 'Facebook Message'],
  $message_body$I'd be happy to listen if you ever want another set of ears on something you're working on. I run JMT Music and spend a lot of my time producing, arranging, and helping artists develop songs. No formal pitch—I'd just be interested in hearing it.$message_body$,
  array[]::text[],
  array['Introducing JMT Music', 'Artist Appreciation'],
  1,
  'active',
  22
from public.properties p
where p.slug = 'jmt-music'
  and not exists (
    select 1 from public.communication_playbook cp
    where cp.property_id = p.id and cp.title = 'Offering to Listen to a Demo'
  );

-- 10. When They Ask for More Information
insert into public.communication_playbook (
  property_id, category, title, purpose, best_used_for, message_body, variables,
  tags, version_number, status, sort_order
)
select
  p.id,
  'outreach',
  'When They Ask for More Information',
  $purpose$Use when: the artist directly asks for more information about JMT Music.$purpose$,
  array['Instagram DM', 'Facebook Message'],
  $message_body$Absolutely. JMT Music is my production company. I work closely with artists on custom production, arrangement, piano and keys, mixing, and overall song development. The focus is very collaborative—I want the final music to still feel unmistakably like the artist.$message_body$,
  array[]::text[],
  array['Introducing JMT Music', 'Artist Appreciation'],
  1,
  'active',
  23
from public.properties p
where p.slug = 'jmt-music'
  and not exists (
    select 1 from public.communication_playbook cp
    where cp.property_id = p.id and cp.title = 'When They Ask for More Information'
  );

-- 11. Sharing the Website
insert into public.communication_playbook (
  property_id, category, title, purpose, best_used_for, message_body, variables,
  internal_notes, tags, version_number, status, sort_order
)
select
  p.id,
  'outreach',
  'Sharing the Website',
  $purpose$Use only when: the artist asks for more information, expresses interest in working together, asks to hear Jonathan's work, or the conversation has clearly moved toward a possible collaboration.$purpose$,
  array['Instagram DM', 'Facebook Message'],
  $message_body$Here's the JMT Music site if you'd like to hear some of my work and see what I do: https://www.jmtmusic.studio/$message_body$,
  array[]::text[],
  $internal_notes$Do not send the website as part of the original appreciation message — only once the artist has actually asked for more, expressed interest, asked to hear the work, or the conversation has clearly moved toward a possible collaboration.$internal_notes$,
  array['Introducing JMT Music', 'Artist Appreciation'],
  1,
  'active',
  24
from public.properties p
where p.slug = 'jmt-music'
  and not exists (
    select 1 from public.communication_playbook cp
    where cp.property_id = p.id and cp.title = 'Sharing the Website'
  );

-- ---------------------------------------------------------------------------
-- ROLLBACK (manual only — do not run unless reverting this migration)
-- ---------------------------------------------------------------------------
-- -- Restore internal_notes from the version snapshot taken above, and step the version
-- -- number back down, rather than trying to string-split the appended section back out:
-- update public.communication_playbook cp
-- set internal_notes = v.internal_notes, version_number = v.version_number
-- from public.communication_playbook_versions v
-- where cp.id = v.playbook_id
--   and cp.title = 'Artist Appreciation Outreach'
--   and v.version_number = cp.version_number - 1;
--
-- delete from public.communication_playbook
-- where property_id = (select id from public.properties where slug = 'jmt-music')
--   and title in (
--     'When They Ask What You Do',
--     'Short and Casual',
--     'Conversation Turns Toward Music Production',
--     'When Their Music Inspires a Production Idea',
--     'When They Mention an Upcoming Project',
--     'Gentle Collaboration Opening',
--     'Direct but Low-Pressure Invitation',
--     'Offering to Listen to a Demo',
--     'When They Ask for More Information',
--     'Sharing the Website'
--   );
