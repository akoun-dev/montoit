-- 032_certifications.sql
-- User, property, and agency certifications granted/revoked by Tiers de Confiance (TC).

create table if not exists certifications (
  id                text                 primary key,
  type              certification_type   not null,
  status            certification_status not null default 'PENDING',
  notes             text,
  revoked_at        timestamptz,
  revocation_reason text,
  expires_at        timestamptz,
  created_at        timestamptz          not null default now(),
  updated_at        timestamptz          not null default now(),
  user_id           text                 not null references users(id) on delete cascade,
  granted_by_id     text                 not null references users(id) on delete cascade,
  property_id       text                 references properties(id) on delete set null
);

create index if not exists idx_certifications_user_id on certifications (user_id);
create index if not exists idx_certifications_granted_by_id on certifications (granted_by_id);
create index if not exists idx_certifications_status on certifications (status);
create index if not exists idx_certifications_type on certifications (type);
create index if not exists idx_certifications_property_id on certifications (property_id);

alter table certifications enable row level security;

create trigger trg_certifications_updated_at
  before update on certifications
  for each row
  execute function update_updated_at_column();

-- rls policies for certifications
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "certifications_select_own"
  on certifications for select
  to authenticated
  using ((select auth.uid()::text) = user_id);

create policy "certifications_select_tc"
  on certifications for select
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );

create policy "certifications_insert_tc"
  on certifications for insert
  to authenticated
  with check (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );

create policy "certifications_update_tc"
  on certifications for update
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  )
  with check (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );
