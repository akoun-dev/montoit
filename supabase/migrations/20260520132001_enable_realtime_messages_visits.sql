-- Enable Realtime for the messages and visit_requests tables.
-- This allows the frontend to subscribe to INSERT/UPDATE events via Supabase Realtime
-- for real-time message delivery and visit request updates.

alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table visit_requests;
