-- 020_leases.sql
-- Rental lease/contracts with electronic signature tracking (CRYPTONEO).
-- Links property, tenant, owner, and the validated rental file.

create table if not exists leases (
  id                   text          primary key,
  status               lease_status  not null default 'DRAFT',
  start_date           timestamptz   not null,
  end_date             timestamptz   not null,
  monthly_rent         real          not null,
  charges              real          not null default 0,
  deposit              real          not null default 0,
  special_conditions   text,
  owner_signed_at      timestamptz,
  owner_sign_otp       text,
  owner_signature_image text,
  tenant_signed_at     timestamptz,
  tenant_sign_otp      text,
  tenant_signature_image text,
  created_at           timestamptz   not null default now(),
  updated_at           timestamptz   not null default now(),
  property_id          text          not null references properties(id) on delete cascade,
  tenant_id            text          not null references users(id) on delete cascade,
  owner_id             text          not null references users(id) on delete cascade,
  rental_file_id       text          not null references rental_files(id) on delete cascade
);

create index if not exists idx_leases_property_id on leases (property_id);
create index if not exists idx_leases_tenant_id on leases (tenant_id);
create index if not exists idx_leases_owner_id on leases (owner_id);
create index if not exists idx_leases_status on leases (status);

alter table leases enable row level security;

create trigger trg_leases_updated_at
  before update on leases
  for each row
  execute function update_updated_at_column();

-- rls policies for leases
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "leases_select_participant"
  on leases for select
  to authenticated
  using (
    (select auth.uid()::text) in (tenant_id, owner_id)
  );

create policy "leases_select_admin"
  on leases for select
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );

create policy "leases_insert_admin"
  on leases for insert
  to authenticated
  with check (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );

create policy "leases_update_participant"
  on leases for update
  to authenticated
  using (
    (select auth.uid()::text) in (tenant_id, owner_id)
  )
  with check (
    (select auth.uid()::text) in (tenant_id, owner_id)
  );

create policy "leases_update_admin"
  on leases for update
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  )
  with check (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );
