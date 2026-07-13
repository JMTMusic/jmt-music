-- READ ONLY: verifies the ar_artists schema objects and reports current row counts.
select table_name from information_schema.tables where table_schema='public' and table_name='ar_artists';
select table_name,column_name,data_type,is_nullable from information_schema.columns where table_schema='public' and table_name='ar_artists' order by ordinal_position;
select conname,pg_get_constraintdef(oid) as definition from pg_constraint where conrelid='public.ar_artists'::regclass;
select tablename,indexname,indexdef from pg_indexes where schemaname='public' and tablename='ar_artists' order by indexname;
select relname as table_name,relrowsecurity as rls_enabled from pg_class join pg_namespace on pg_namespace.oid=pg_class.relnamespace where nspname='public' and relname='ar_artists';
select tablename,policyname,roles,cmd from pg_policies where schemaname='public' and tablename='ar_artists' order by policyname;
select event_object_table as table_name,trigger_name,event_manipulation from information_schema.triggers where trigger_schema='public' and event_object_table='ar_artists';
-- Confirm related_client_id/related_sales_opportunity_id are both SET NULL, not
-- CASCADE/RESTRICT — an A&R record must survive its linked Client or Sales Opportunity
-- being deleted.
select
  con.conname,
  (select attname from pg_attribute where attrelid = con.conrelid and attnum = con.conkey[1]) as column_name,
  case con.confdeltype
    when 'a' then 'NO ACTION' when 'r' then 'RESTRICT' when 'c' then 'CASCADE'
    when 'n' then 'SET NULL' when 'd' then 'SET DEFAULT' else con.confdeltype::text
  end as on_delete
from pg_constraint con
where con.conrelid = 'public.ar_artists'::regclass and con.contype = 'f';
select count(*) as row_count from public.ar_artists;
select status, count(*) from public.ar_artists group by status order by status;
