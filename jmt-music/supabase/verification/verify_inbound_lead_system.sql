-- READ ONLY: verifies inbound schema objects and reports test/current row counts.
select table_name from information_schema.tables where table_schema='public' and table_name in ('project_discoveries','contact_messages','beat_inquiries') order by table_name;
select table_name,column_name,data_type,is_nullable from information_schema.columns where table_schema='public' and table_name in ('project_discoveries','contact_messages','beat_inquiries') order by table_name,ordinal_position;
select tablename,indexname,indexdef from pg_indexes where schemaname='public' and tablename in ('project_discoveries','contact_messages','beat_inquiries') order by tablename,indexname;
select relname as table_name,relrowsecurity as rls_enabled from pg_class join pg_namespace on pg_namespace.oid=pg_class.relnamespace where nspname='public' and relname in ('project_discoveries','contact_messages','beat_inquiries') order by relname;
select tablename,policyname,roles,cmd from pg_policies where schemaname='public' and tablename in ('project_discoveries','contact_messages','beat_inquiries') order by tablename,policyname;
select event_object_table as table_name,trigger_name,event_manipulation from information_schema.triggers where trigger_schema='public' and event_object_table in ('project_discoveries','contact_messages','beat_inquiries') order by event_object_table,trigger_name;
select routine_name,routine_type,security_type from information_schema.routines where routine_schema='public' and routine_name='convert_inbound_to_project';
select 'project_discoveries' as table_name,count(*) as row_count,count(*) filter(where email like '%@example.test') as test_count from public.project_discoveries
union all select 'contact_messages',count(*),count(*) filter(where email like '%@example.test') from public.contact_messages
union all select 'beat_inquiries',count(*),count(*) filter(where email like '%@example.test') from public.beat_inquiries;
