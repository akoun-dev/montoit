-- 010_owner_files.sql
-- Owner/landlord verification dossiers.
-- Validated by Tiers de Confiance (TC) to confirm owner identity and solvency.

create table if not exists owner_files (
  id                 text              primary key,
  status             rental_file_status not null default 'DRAFT',
  monthly_income     real,
  employer           text,
  employment_type    employment_type,
  guarantor_name     text,
  guarantor_phone    text,
  guarantor_relation text,
  valid_until        timestamptz,
  rejection_reason   text,
  tc_comment         text,
  reviewed_at        timestamptz,
  created_at         timestamptz        not null default now(),
  updated_at         timestamptz        not null default now(),
  owner_id           text               not null references users(id) on delete cascade,
  reviewed_by_id     text               references users(id) on delete set null
);

create index if not exists idx_owner_files_status on owner_files (status);
create index if not exists idx_owner_files_owner_id on owner_files (owner_id);

alter table owner_files enable row level security;

create trigger trg_owner_files_updated_at
  before update on owner_files
  for each row
  execute function update_updated_at_column();

-- rls policies for owner files
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "owner_files_select_own"
  on owner_files for select
  to authenticated
  using ((select auth.uid()::text) = owner_id);

create policy "owner_files_select_tc"
  on owner_files for select
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );

create policy "owner_files_insert_own"
  on owner_files for insert
  to authenticated
  with check ((select auth.uid()::text) = owner_id);

create policy "owner_files_update_own"
  on owner_files for update
  to authenticated
  using ((select auth.uid()::text) = owner_id)
  with check ((select auth.uid()::text) = owner_id);

create policy "owner_files_update_tc"
  on owner_files for update
  to authenticated
  using (exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN')))
  with check (exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN')));

create policy "owner_files_delete_own"
  on owner_files for delete
  to authenticated
  using ((select auth.uid()::text) = owner_id);
