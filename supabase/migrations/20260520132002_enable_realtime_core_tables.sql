-- Enable Realtime publication for core business tables
-- These tables contain data that benefits from live updates in the dashboard

do $$
declare
  table_name text;
begin
  foreach table_name in array array['payments', 'leases', 'maintenance_requests', 'applications', 'rental_files'] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end
$$;
