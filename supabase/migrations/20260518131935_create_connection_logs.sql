-- 035_connection_logs.sql
-- User login connection logs for security monitoring.

create table if not exists connection_logs (
  id         text        primary key,
  ip_address text,
  user_agent text,
  device     text,
  location   text,
  created_at timestamptz not null default now(),
  user_id    text        not null references users(id) on delete cascade
);

create index if not exists idx_connection_logs_user_id on connection_logs (user_id);
create index if not exists idx_connection_logs_created_at on connection_logs (created_at);

alter table connection_logs enable row level security;

-- rls policies for connection logs
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "connection_logs_select_own"
  on connection_logs for select
  to authenticated
  using ((select auth.uid()::text) = user_id);
