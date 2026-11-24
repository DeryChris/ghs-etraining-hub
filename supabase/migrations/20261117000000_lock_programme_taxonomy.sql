-- The programme taxonomy tables were created after the lock-down migration, and
-- enabling RLS is per table: `alter default privileges` removes their grants but
-- does not turn RLS on. Same rule as 20260113 — the app connects as `postgres`
-- (BYPASSRLS), so it is unaffected; PostgREST clients are denied by default.

do $$
declare
  t text;
begin
  foreach t in array array['programme_fields', 'programme_areas', 'area_facilitators']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('revoke all on table public.%I from anon, authenticated', t);
    end if;
  end loop;
end $$;
