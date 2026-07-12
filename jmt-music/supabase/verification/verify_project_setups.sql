-- READ ONLY: verifies the project_setups schema objects and reports current row counts.
select table_name from information_schema.tables where table_schema='public' and table_name='project_setups';
select table_name,column_name,data_type,is_nullable from information_schema.columns where table_schema='public' and table_name='project_setups' order by ordinal_position;
select conname,pg_get_constraintdef(oid) as definition from pg_constraint where conrelid='public.project_setups'::regclass;
select tablename,indexname,indexdef from pg_indexes where schemaname='public' and tablename='project_setups' order by indexname;
select relname as table_name,relrowsecurity as rls_enabled from pg_class join pg_namespace on pg_namespace.oid=pg_class.relnamespace where nspname='public' and relname='project_setups';
select tablename,policyname,roles,cmd from pg_policies where schemaname='public' and tablename='project_setups' order by policyname;
select event_object_table as table_name,trigger_name,event_manipulation from information_schema.triggers where trigger_schema='public' and event_object_table='project_setups';
-- Confirm the FK on project_id is RESTRICT, not CASCADE — the one behavior change that
-- can't be seen from the constraint definition alone in every Postgres version.
select
  con.conname,
  case con.confdeltype
    when 'a' then 'NO ACTION' when 'r' then 'RESTRICT' when 'c' then 'CASCADE'
    when 'n' then 'SET NULL' when 'd' then 'SET DEFAULT' else con.confdeltype::text
  end as on_delete
from pg_constraint con
where con.conrelid = 'public.project_setups'::regclass and con.contype = 'f';
select count(*) as row_count from public.project_setups;
