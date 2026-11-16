-- Security hardening: the Supabase anon key is public (shipped in the browser bundle).
-- Without RLS, anyone holding it could read/write staff PII through /rest/v1/*.
-- The application connects with the `postgres` role (BYPASSRLS = true), so it is
-- unaffected. PostgREST clients (anon, authenticated) are now denied by default.
-- Access policies, if ever needed, must be added explicitly per table and reviewed.

do $$
declare
  t record;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t.tablename);
    execute format('revoke all on table public.%I from anon, authenticated', t.tablename);
  end loop;
end $$;

-- Future tables created by migrations inherit the same lock-down.
alter default privileges in schema public revoke all on tables from anon, authenticated;
