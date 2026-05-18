-- 038_commissions.sql
-- Agency commission tracking. Commissions are earned by agency agents
-- and paid by the agency. Optionally linked to a mandat or lease.

create table if not exists commissions (
  id          text              primary key,
  amount      real              not null,
  rate        real              not null,
  status      commission_status not null default 'PENDING',
  description text,
  paid_at     timestamptz,
  created_at  timestamptz       not null default now(),
  updated_at  timestamptz       not null default now(),
  agent_id    text              not null references agency_agents(id) on delete cascade,
  agency_id   text              not null references users(id) on delete cascade,
  mandat_id   text              references mandats(id) on delete set null,
  lease_id    text              references leases(id) on delete set null
);

create index if not exists idx_commissions_agent_id on commissions (agent_id);
create index if not exists idx_commissions_agency_id on commissions (agency_id);
create index if not exists idx_commissions_status on commissions (status);
create index if not exists idx_commissions_mandat_id on commissions (mandat_id);

alter table commissions enable row level security;

create trigger trg_commissions_updated_at
  before update on commissions
  for each row
  execute function update_updated_at_column();

-- rls policies for commissions
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "commissions_select_agency"
  on commissions for select
  to authenticated
  using (
    (select auth.uid()::text) = agency_id
    or exists (
      select 1 from agency_agents
      where id = agent_id and agency_id = (select auth.uid()::text)
    )
  );

create policy "commissions_insert_agency"
  on commissions for insert
  to authenticated
  with check ((select auth.uid()::text) = agency_id);

create policy "commissions_update_agency"
  on commissions for update
  to authenticated
  using ((select auth.uid()::text) = agency_id)
  with check ((select auth.uid()::text) = agency_id);
