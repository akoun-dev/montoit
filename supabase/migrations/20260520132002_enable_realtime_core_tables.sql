-- Enable Realtime publication for core business tables
-- These tables contain data that benefits from live updates in the dashboard

alter publication supabase_realtime add table payments;
alter publication supabase_realtime add table leases;
alter publication supabase_realtime add table maintenance_requests;
alter publication supabase_realtime add table applications;
alter publication supabase_realtime add table rental_files;
