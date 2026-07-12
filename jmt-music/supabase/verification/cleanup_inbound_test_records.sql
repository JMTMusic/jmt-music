-- OPTIONAL AND DESTRUCTIVE. Review the rows first. This removes ONLY obvious test inbound records.
select 'project_discoveries' as source,id,email,submitted_at from public.project_discoveries where email like '%@example.test'
union all select 'contact_messages',id,email,submitted_at from public.contact_messages where email like '%@example.test'
union all select 'beat_inquiries',id,email,submitted_at from public.beat_inquiries where email like '%@example.test' order by submitted_at;

-- Run these statements only after confirming the rows above are disposable test data.
delete from public.project_discoveries where email like '%@example.test';
delete from public.contact_messages where email like '%@example.test';
delete from public.beat_inquiries where email like '%@example.test';
