-- 024_audit_logs.sql
-- Audit trail for tracking important user actions across the platform.

create table if not exists audit_logs (
  id         text        primary key,
  action     text        not null,
  entity     text        not null,
  entity_id  text,
  details    text,
  created_at timestamptz not null default now(),
  user_id    text        not null references users(id) on delete cascade
);

create index if not exists idx_audit_logs_user_id on audit_logs (user_id);
create index if not exists idx_audit_logs_entity on audit_logs (entity);
create index if not exists idx_audit_logs_action on audit_logs (action);
create index if not exists idx_audit_logs_created_at on audit_logs (created_at);

alter table audit_logs enable row level security;

-- rls policies for audit logs
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "audit_logs_select_admin"
  on audit_logs for select
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role = 'ADMIN')
  );
