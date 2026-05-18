-- 028_maintenance_requests.sql
-- Maintenance/repair requests initiated by tenants for their leased property.

create table if not exists maintenance_requests (
  id           text                primary key,
  title        text                not null,
  description  text                not null,
  status       maintenance_status  not null default 'PENDING',
  priority     maintenance_priority not null default 'MEDIUM',
  images       text                not null default '[]',
  scheduled_at timestamptz,
  resolution   text,
  created_at   timestamptz         not null default now(),
  updated_at   timestamptz         not null default now(),
  lease_id     text                not null references leases(id) on delete cascade,
  tenant_id    text                not null references users(id) on delete cascade
);

create index if not exists idx_maintenance_requests_lease_id on maintenance_requests (lease_id);
create index if not exists idx_maintenance_requests_tenant_id on maintenance_requests (tenant_id);
create index if not exists idx_maintenance_requests_status on maintenance_requests (status);
create index if not exists idx_maintenance_requests_created_at on maintenance_requests (created_at);

alter table maintenance_requests enable row level security;

create trigger trg_maintenance_requests_updated_at
  before update on maintenance_requests
  for each row
  execute function update_updated_at_column();

-- rls policies for maintenance requests
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "maintenance_requests_select_tenant"
  on maintenance_requests for select
  to authenticated
  using ((select auth.uid()::text) = tenant_id);

create policy "maintenance_requests_select_owner"
  on maintenance_requests for select
  to authenticated
  using (
    exists (
      select 1 from leases
      where id = lease_id and owner_id = (select auth.uid()::text)
    )
  );

create policy "maintenance_requests_select_tc"
  on maintenance_requests for select
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );

create policy "maintenance_requests_insert_own"
  on maintenance_requests for insert
  to authenticated
  with check ((select auth.uid()::text) = tenant_id);

create policy "maintenance_requests_update_participant"
  on maintenance_requests for update
  to authenticated
  using (
    (select auth.uid()::text) = tenant_id
    or exists (
      select 1 from leases
      where id = lease_id and owner_id = (select auth.uid()::text)
    )
  )
  with check (
    (select auth.uid()::text) = tenant_id
    or exists (
      select 1 from leases
      where id = lease_id and owner_id = (select auth.uid()::text)
    )
  );

create policy "maintenance_requests_delete_own"
  on maintenance_requests for delete
  to authenticated
  using ((select auth.uid()::text) = tenant_id);
