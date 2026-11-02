-- 013_sessions.sql
-- User session management (cookie-based auth).
-- Each session is a httpOnly cookie with sliding 30-day expiration.

create table if not exists sessions (
  id         text        primary key,
  token      text        not null unique,
  user_id    text        not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_sessions_token on sessions (token);
create index if not exists idx_sessions_user_id on sessions (user_id);
create index if not exists idx_sessions_expires_at on sessions (expires_at);

alter table sessions enable row level security;

-- rls policies for sessions
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

-- Service role full access (for server-side operations)
create policy "service_role_full_access"
  on sessions for all
  to service_role
  using (true)
  with check (true);

create policy "sessions_select_own"
  on sessions for select
  to authenticated
  using ((select auth.uid()::text) = user_id);

create policy "sessions_insert_auth"
  on sessions for insert
  to authenticated
  with check ((select auth.uid()::text) = user_id);

create policy "sessions_delete_own"
  on sessions for delete
  to authenticated
  using ((select auth.uid()::text) = user_id);
