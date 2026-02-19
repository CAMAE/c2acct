select schemaname, tablename
from pg_tables
where schemaname not in ('pg_catalog','information_schema')
  and (tablename ilike '%survey%' or tablename ilike '%module%' or tablename ilike '%question%')
order by schemaname, tablename;

