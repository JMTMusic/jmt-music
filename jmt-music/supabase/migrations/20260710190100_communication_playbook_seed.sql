-- Growth Engine Foundation: seed Play 001 into the Communication Playbook.
-- Additive only. Idempotent — safe to re-run; skips if a Play with this exact title
-- already exists for the property, rather than relying on a title unique constraint
-- (title isn't unique by design, so a real-world duplicate title later is not an error).

insert into public.communication_playbook (
  property_id, category, title, purpose, best_used_for, message_body, variables,
  internal_notes, version_number, status, sort_order
)
select
  p.id,
  'outreach',
  'Artist Introduction & Connection',
  'Introduce JMT Music in a way that starts a genuine relationship rather than making a sales pitch.',
  array['Instagram DM', 'Facebook Message', 'Email Introduction (adapted)', 'Networking', 'Cold Outreach'],
  E'Hi [Artist],\n\nI spent some time listening to your music today, and I really enjoyed what I heard.\n\nIt''s always encouraging to come across artists who are creating music with honesty and intention, and I wanted to reach out simply to say I appreciate what you''re doing.\n\nI love working alongside artists and helping bring their vision to life. Every project is different, but my approach never changes: every song deserves the same level of attention and care that the artist has poured into creating it.\n\nNo expectations at all—I just wanted to introduce myself, let you know I enjoyed your work, and say I''d love to connect. If another creative partner ever feels like the right fit for a future project, I''d be honored to be part of it.\n\nEither way, I wish you nothing but success, and I''ll be looking forward to hearing what you create next.\n\n— Jonathan\nJMT Music',
  array['artist_name'],
  E'This message is not intended to sell.\nIt exists to begin a relationship.\nThe artist should leave the conversation feeling respected whether they ever become a client or not.\nThe artist is always the hero.\nJMT Music is the creative partner.',
  1,
  'active',
  0
from public.properties p
where p.slug = 'jmt-music'
  and not exists (
    select 1 from public.communication_playbook cp
    where cp.property_id = p.id and cp.title = 'Artist Introduction & Connection'
  );

-- ---------------------------------------------------------------------------
-- ROLLBACK (manual only — do not run unless reverting this migration)
-- ---------------------------------------------------------------------------
-- delete from public.communication_playbook
-- where title = 'Artist Introduction & Connection'
--   and property_id = (select id from public.properties where slug = 'jmt-music');
