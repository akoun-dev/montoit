-- 041_mandats.sql
-- Agency management mandates linking property owners with agencies.
-- Defines commission structure and management scope.

create table if not exists mandats (
  id                 text          primary key,
  type               mandat_type   not null default 'GESTION_LOCATION',
  status             mandat_status not null default 'DRAFT',
  commission_rate    real          not null default 0,
  commission_type    text          not null default 'PERCENTAGE',
  fixed_commission   real,
  start_date         timestamptz   not null,
  end_date           timestamptz   not null,
  conditions         text,
  owner_signed_at    timestamptz,
  agency_signed_at   timestamptz,
  terminated_at      timestamptz,
  termination_reason text,
  created_at         timestamptz   not null default now(),
  updated_at         timestamptz   not null default now(),
  property_id        text          not null references properties(id) on delete cascade,
  owner_id           text          not null references users(id) on delete cascade,
  agency_id          text          not null references users(id) on delete cascade
);

create index if not exists idx_mandats_property_id on mandats (property_id);
create index if not exists idx_mandats_owner_id on mandats (owner_id);
create index if not exists idx_mandats_agency_id on mandats (agency_id);
create index if not exists idx_mandats_status on mandats (status);

alter table mandats enable row level security;

create trigger trg_mandats_updated_at
  before update on mandats
  for each row
  execute function update_updated_at_column();

-- rls policies for mandats
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "mandats_select_participant"
  on mandats for select
  to authenticated
  using (
    (select auth.uid()::text) in (owner_id, agency_id)
  );

create policy "mandats_select_admin"
  on mandats for select
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );

create policy "mandats_insert_owner"
  on mandats for insert
  to authenticated
  with check ((select auth.uid()::text) = owner_id);

create policy "mandats_update_participant"
  on mandats for update
  to authenticated
  using (
    (select auth.uid()::text) in (owner_id, agency_id)
  )
  with check (
    (select auth.uid()::text) in (owner_id, agency_id)
  );

create policy "mandats_delete_owner"
  on mandats for delete
  to authenticated
  using ((select auth.uid()::text) = owner_id);

alter publication supabase_realtime add table mandats;
