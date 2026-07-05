-- JMT Music Control Center: initial managed properties
-- Idempotent seed data; existing rows are updated by slug.

insert into public.properties (
  id,
  slug,
  name,
  domain,
  focus,
  status,
  is_public
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'jmt-music',
    'JMT Music',
    'jmtmusic.studio',
    'Beats, production, sync, artists, and clients',
    'active',
    true
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'jonathan-tripp',
    'Jonathan Tripp',
    'jonathan-tripp.com',
    'Personal artist site, piano lessons, live gigs, and performer brand',
    'planned',
    false
  )
on conflict (slug) do update
set
  name = excluded.name,
  domain = excluded.domain,
  focus = excluded.focus,
  status = excluded.status,
  is_public = excluded.is_public,
  updated_at = now();
