-- Enable realtime for notifications table
alter publication supabase_realtime add table notifications;

-- Enable realtime for related tables that affect counters
alter publication supabase_realtime add table visit_requests;
alter publication supabase_realtime add table rental_applications;
alter publication supabase_realtime add table conversations;

-- Grant necessary permissions for realtime
grant select on notifications to authenticated;
grant select on visit_requests to authenticated;
grant select on rental_applications to authenticated;
grant select on conversations to authenticated;
