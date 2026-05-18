-- 030_verification_agents.sql
-- On-site verification agents managed by Tiers de Confiance (TC).
-- Agents perform property verification and inventory report missions.

create table if not exists verification_agents (
  id         text        primary key,
  first_name text        not null,
  last_name  text        not null,
  email      text        not null,
  phone      text,
  is_active  boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  tc_id      text        not null references users(id) on delete cascade
);

-- each TC can have only one agent with a given email
create unique index if not exists idx_verification_agents_tc_email on verification_agents (tc_id, email);
create index if not exists idx_verification_agents_tc_id on verification_agents (tc_id);
create index if not exists idx_verification_agents_is_active on verification_agents (is_active);

alter table verification_agents enable row level security;

create trigger trg_verification_agents_updated_at
  before update on verification_agents
  for each row
  execute function update_updated_at_column();

-- rls policies for verification agents
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "verification_agents_select_tc"
  on verification_agents for select
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );

create policy "verification_agents_insert_tc"
  on verification_agents for insert
  to authenticated
  with check ((select auth.uid()::text) = tc_id);

create policy "verification_agents_update_tc"
  on verification_agents for update
  to authenticated
  using ((select auth.uid()::text) = tc_id)
  with check ((select auth.uid()::text) = tc_id);

create policy "verification_agents_delete_tc"
  on verification_agents for delete
  to authenticated
  using ((select auth.uid()::text) = tc_id);
