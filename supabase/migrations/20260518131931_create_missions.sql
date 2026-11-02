-- 031_missions.sql
-- On-site verification missions assigned to verification agents by TC.
-- Can be linked to an inventory report generated during the mission.

create table if not exists missions (
  id                 text           primary key,
  type               mission_type   not null,
  status             mission_status not null default 'ASSIGNED',
  priority           dossier_priority not null default 'NORMAL',
  notes              text,
  report_url         text,
  photo_urls         text           not null default '[]',
  scheduled_at       timestamptz    not null,
  completed_at       timestamptz,
  feedback           text,
  created_at         timestamptz    not null default now(),
  updated_at         timestamptz    not null default now(),
  property_id        text           not null references properties(id) on delete cascade,
  agent_id           text           not null references verification_agents(id) on delete cascade,
  tc_id              text           not null references users(id) on delete cascade,
  inventory_report_id text          unique references inventory_reports(id) on delete set null
);

create index if not exists idx_missions_property_id on missions (property_id);
create index if not exists idx_missions_agent_id on missions (agent_id);
create index if not exists idx_missions_tc_id on missions (tc_id);
create index if not exists idx_missions_status on missions (status);
create index if not exists idx_missions_scheduled_at on missions (scheduled_at);

alter table missions enable row level security;

create trigger trg_missions_updated_at
  before update on missions
  for each row
  execute function update_updated_at_column();

-- rls policies for missions
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "missions_select_tc"
  on missions for select
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );

create policy "missions_insert_tc"
  on missions for insert
  to authenticated
  with check ((select auth.uid()::text) = tc_id);

create policy "missions_update_tc"
  on missions for update
  to authenticated
  using ((select auth.uid()::text) = tc_id)
  with check ((select auth.uid()::text) = tc_id);
