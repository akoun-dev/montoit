-- 008_rental_files.sql
-- Tenant rental application dossiers (dossier locatif).
-- Contains financial information, employment details, guarantor info.
-- Validated by Tiers de Confiance (TC) reviewers.

create table if not exists rental_files (
  id                text              primary key,
  status            rental_file_status not null default 'DRAFT',
  priority          dossier_priority   not null default 'NORMAL',
  on_hold           boolean            not null default false,
  on_hold_reason    text,
  tenant_category   tenant_category,
  monthly_income    real,
  employer          text,
  employment_type   employment_type,
  guarantor_name    text,
  guarantor_phone   text,
  guarantor_relation text,
  valid_until       timestamptz,
  rejection_reason  text,
  tc_comment        text,
  reviewed_at       timestamptz,
  created_at        timestamptz        not null default now(),
  updated_at        timestamptz        not null default now(),
  tenant_id         text               not null references users(id) on delete cascade,
  reviewed_by_id    text               references users(id) on delete set null
);

create index if not exists idx_rental_files_status on rental_files (status);
create index if not exists idx_rental_files_tenant_id on rental_files (tenant_id);

-- Un seul dossier brouillon (DRAFT) par locataire
create unique index if not exists idx_rental_files_one_draft_per_tenant
  on rental_files (tenant_id) where status = 'DRAFT';

alter table rental_files enable row level security;

create trigger trg_rental_files_updated_at
  before update on rental_files
  for each row
  execute function update_updated_at_column();

-- rls policies for rental files
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "rental_files_select_own"
  on rental_files for select
  to authenticated
  using ((select auth.uid()::text) = tenant_id);

create policy "rental_files_select_tc"
  on rental_files for select
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );

create policy "rental_files_insert_own"
  on rental_files for insert
  to authenticated
  with check ((select auth.uid()::text) = tenant_id);

create policy "rental_files_update_own"
  on rental_files for update
  to authenticated
  using ((select auth.uid()::text) = tenant_id)
  with check ((select auth.uid()::text) = tenant_id);

create policy "rental_files_update_tc"
  on rental_files for update
  to authenticated
  using (exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN')))
  with check (exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN')));

create policy "rental_files_delete_own"
  on rental_files for delete
  to authenticated
  using ((select auth.uid()::text) = tenant_id);
