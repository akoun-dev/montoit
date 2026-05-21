-- Enable Realtime for the notifications table
-- This allows the frontend to subscribe to INSERT events via Supabase Realtime
-- instead of using a separate Socket.IO WebSocket server.

alter publication supabase_realtime add table notifications;
