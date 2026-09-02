-- Enable Realtime publication for inventory report tables
-- Required for the useRealtimeInventoryReports hook to work

alter publication supabase_realtime add table inventory_reports;
alter publication supabase_realtime add table inventory_report_items;