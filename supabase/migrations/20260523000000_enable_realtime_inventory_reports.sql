-- Enable Realtime publication for inventory report tables
-- Required for the useRealtimeInventoryReports hook to work

do $$
declare
  table_name text;
begin
  foreach table_name in array array['inventory_reports', 'inventory_report_items'] loop
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
