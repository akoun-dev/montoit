-- Enable Realtime for the notifications table
-- This allows the frontend to subscribe to INSERT events via Supabase Realtime
-- instead of using a separate Socket.IO WebSocket server.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;
