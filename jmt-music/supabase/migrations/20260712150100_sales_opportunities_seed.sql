-- Sales module — seed the AirGigs proposal sent 2026-07-12 (Cloud Nine sample).
-- Additive only. Idempotent — safe to re-run; skips if an opportunity with this exact
-- title already exists for the property, same convention as the Communication Playbook's
-- seed migration (20260710190100_communication_playbook_seed.sql).

insert into public.sales_opportunities (
  property_id, title, artist_name, platform, service_type,
  budget_amount, currency, status, probability,
  proposal_sent_at, follow_up_at,
  notes, proposal_text, sample_title, sample_description
)
select
  p.id,
  'Ambient Pop Production, Mixing & Mastering',
  'Unknown Artist',
  'airgigs',
  'production_mix_master',
  100.00,
  'USD',
  'proposal_sent',
  'medium',
  '2026-07-12 12:00:00-05',
  '2026-07-16 12:00:00-05',
  $notes$Electronic pop with a bluesy, jazz-inspired chord progression. Client wants ambient textures and a tasteful instrumental solo during the bridge.$notes$,
  $proposal$Hi!

Your project immediately caught my attention because it sounds like you're creating something unique rather than chasing a generic pop sound. The combination of electronic pop with bluesy, jazz-inspired harmony sounds like a really exciting project.

I'm Jonathan from JMT Music, and I specialize in creating polished, professional mixes while preserving the emotion and character of an artist's vision.

As both a producer and pianist, I was especially interested in your mention of adding ambient textures and a tasteful instrumental moment during the bridge. Those creative touches are some of my favorite parts of the production process, and I'd love the opportunity to help elevate the song while keeping its unique identity intact.

I'd love to hear your track and discuss your vision before getting started. My goal is to deliver a mix that feels polished, musical, and true to the emotion of your song.

Looking forward to hearing from you!

Jonathan Tripp
Producer • Mixing Engineer • JMT Music$proposal$,
  'Cloud Nine – Production, Mixing & Mastering Sample',
  $sample$This is one of my recent productions and reflects the quality I strive to bring to every project. From production and arrangement to mixing and mastering, my goal is to create music that feels polished, dynamic, and true to the artist's vision.$sample$
from public.properties p
where p.slug = 'jmt-music'
  and not exists (
    select 1 from public.sales_opportunities so
    where so.property_id = p.id and so.title = 'Ambient Pop Production, Mixing & Mastering'
  );

-- ---------------------------------------------------------------------------
-- ROLLBACK (manual only — do not run unless reverting this migration)
-- ---------------------------------------------------------------------------
-- delete from public.sales_opportunities
-- where title = 'Ambient Pop Production, Mixing & Mastering'
--   and property_id = (select id from public.properties where slug = 'jmt-music');
