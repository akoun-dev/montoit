-- 015_notifications.sql
-- Notification records for in-app display and WebSocket push delivery.

create table if not exists notifications (
  id         text              primary key,
  type       notification_type not null,
  title      text              not null,
  message    text              not null,
  is_read    boolean           not null default false,
  action_url text,
  entity_id  text,
  created_at timestamptz       not null default now(),
  user_id    text              not null references users(id) on delete cascade
);

create index if not exists idx_notifications_user_id on notifications (user_id);
create index if not exists idx_notifications_is_read on notifications (is_read);
create index if not exists idx_notifications_type on notifications (type);
create index if not exists idx_notifications_created_at on notifications (created_at);

alter table notifications enable row level security;

-- rls policies for notifications
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "notifications_select_own"
  on notifications for select
  to authenticated
  using ((select auth.uid()::text) = user_id);

create policy "notifications_update_own"
  on notifications for update
  to authenticated
  using ((select auth.uid()::text) = user_id)
  with check ((select auth.uid()::text) = user_id);

alter publication supabase_realtime add table notifications;
