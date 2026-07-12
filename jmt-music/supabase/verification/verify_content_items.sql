-- READ ONLY: verifies the content_items schema objects and reports current row counts.
select table_name from information_schema.tables where table_schema='public' and table_name='content_items';
select table_name,column_name,data_type,is_nullable from information_schema.columns where table_schema='public' and table_name='content_items' order by ordinal_position;
select conname,pg_get_constraintdef(oid) as definition from pg_constraint where conrelid='public.content_items'::regclass;
select tablename,indexname,indexdef from pg_indexes where schemaname='public' and tablename='content_items' order by indexname;
select relname as table_name,relrowsecurity as rls_enabled from pg_class join pg_namespace on pg_namespace.oid=pg_class.relnamespace where nspname='public' and relname='content_items';
select tablename,policyname,roles,cmd from pg_policies where schemaname='public' and tablename='content_items' order by policyname;
select event_object_table as table_name,trigger_name,event_manipulation from information_schema.triggers where trigger_schema='public' and event_object_table='content_items';
-- Confirm project_id/client_id/beat_id are all SET NULL, not CASCADE/RESTRICT — a Content
-- Item must survive its linked Project, Client, or Beat being deleted.
select
  con.conname,
  (select attname from pg_attribute where attrelid = con.conrelid and attnum = con.conkey[1]) as column_name,
  case con.confdeltype
    when 'a' then 'NO ACTION' when 'r' then 'RESTRICT' when 'c' then 'CASCADE'
    when 'n' then 'SET NULL' when 'd' then 'SET DEFAULT' else con.confdeltype::text
  end as on_delete
from pg_constraint con
where con.conrelid = 'public.content_items'::regclass and con.contype = 'f';
select count(*) as row_count from public.content_items;
select status, count(*) from public.content_items group by status order by status;
