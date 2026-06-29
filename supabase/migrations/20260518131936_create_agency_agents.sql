-- 036_agency_agents.sql
-- Agency staff members managed by a User with AGENCE role.
-- Each agent can be assigned to specific properties.

create table if not exists agency_agents (
  id         text               primary key,
  first_name text               not null,
  last_name  text               not null,
  email      text               not null,
  phone      text,
  role       agency_agent_role  not null default 'AGENT',
  status     agency_agent_status not null default 'ACTIVE',
  avatar_url text,
  created_at timestamptz        not null default now(),
  updated_at timestamptz        not null default now(),
  agency_id  text               not null references users(id) on delete cascade
);

create index if not exists idx_agency_agents_agency_id on agency_agents (agency_id);
create index if not exists idx_agency_agents_status on agency_agents (status);
create index if not exists idx_agency_agents_email on agency_agents (email);

alter table agency_agents enable row level security;

create trigger trg_agency_agents_updated_at
  before update on agency_agents
  for each row
  execute function update_updated_at_column();

-- rls policies for agency agents
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "agency_agents_select_agency"
  on agency_agents for select
  to authenticated
  using ((select auth.uid()::text) = agency_id);

create policy "agency_agents_insert_agency"
  on agency_agents for insert
  to authenticated
  with check ((select auth.uid()::text) = agency_id);

create policy "agency_agents_update_agency"
  on agency_agents for update
  to authenticated
  using ((select auth.uid()::text) = agency_id)
  with check ((select auth.uid()::text) = agency_id);

create policy "agency_agents_delete_agency"
  on agency_agents for delete
  to authenticated
  using ((select auth.uid()::text) = agency_id);

alter publication supabase_realtime add table agency_agents;
