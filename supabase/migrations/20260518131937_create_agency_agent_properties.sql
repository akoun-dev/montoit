-- 037_agency_agent_properties.sql
-- Assignment of agency agents to specific properties they manage.

create table if not exists agency_agent_properties (
  id          text        primary key,
  assigned_at timestamptz not null default now(),
  agent_id    text        not null references agency_agents(id) on delete cascade,
  property_id text        not null references properties(id) on delete cascade
);

-- each agent can be assigned to a property only once
create unique index if not exists idx_agency_agent_props_agent_property on agency_agent_properties (agent_id, property_id);
create index if not exists idx_agency_agent_props_agent_id on agency_agent_properties (agent_id);
create index if not exists idx_agency_agent_props_property_id on agency_agent_properties (property_id);

alter table agency_agent_properties enable row level security;

-- rls policies for agency agent properties
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "agency_agent_properties_select_agency"
  on agency_agent_properties for select
  to authenticated
  using (
    exists (
      select 1 from agency_agents
      where id = agent_id and agency_id = (select auth.uid()::text)
    )
  );

create policy "agency_agent_properties_insert_agency"
  on agency_agent_properties for insert
  to authenticated
  with check (
    exists (
      select 1 from agency_agents
      where id = agent_id and agency_id = (select auth.uid()::text)
    )
  );

create policy "agency_agent_properties_delete_agency"
  on agency_agent_properties for delete
  to authenticated
  using (
    exists (
      select 1 from agency_agents
      where id = agent_id and agency_id = (select auth.uid()::text)
    )
  );

alter publication supabase_realtime add table agency_agent_properties;
