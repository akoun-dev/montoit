-- 026_inventory_reports.sql
-- Move-in/move-out inventory reports (état des lieux).
-- Signed by both owner and tenant, tracked by Tiers de Confiance.

create table if not exists inventory_reports (
  id                   text             primary key,
  type                 inventory_type   not null,
  status               inventory_status not null default 'DRAFT',
  completed_at         timestamptz,
  owner_signed_at      timestamptz,
  tenant_signed_at     timestamptz,
  general_observations text,
  total_keys           integer,
  created_at           timestamptz      not null default now(),
  updated_at           timestamptz      not null default now(),
  property_id          text             not null references properties(id) on delete cascade,
  reviewer_id          text             not null references users(id) on delete cascade,
  lease_id             text             references leases(id) on delete set null
);

create index if not exists idx_inventory_reports_property_id on inventory_reports (property_id);
create index if not exists idx_inventory_reports_reviewer_id on inventory_reports (reviewer_id);
create index if not exists idx_inventory_reports_status on inventory_reports (status);

alter table inventory_reports enable row level security;

create trigger trg_inventory_reports_updated_at
  before update on inventory_reports
  for each row
  execute function update_updated_at_column();

-- rls policies for inventory reports
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "inventory_reports_select_participant"
  on inventory_reports for select
  to authenticated
  using (
    exists (
      select 1 from leases
      where id = lease_id and (select auth.uid()::text) in (tenant_id, owner_id)
    )
    or (select auth.uid()::text) = reviewer_id
  );

create policy "inventory_reports_select_tc"
  on inventory_reports for select
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );

create policy "inventory_reports_insert_tc"
  on inventory_reports for insert
  to authenticated
  with check (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );

create policy "inventory_reports_update_tc"
  on inventory_reports for update
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  )
  with check (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );

alter publication supabase_realtime add table inventory_reports;
