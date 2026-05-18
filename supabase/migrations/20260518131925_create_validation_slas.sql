-- 025_validation_slas.sql
-- SLA tracking for Tiers de Confiance (TC) validations.
-- Ensures timely review of rental files, owner profiles, and agencies.

create table if not exists validation_slas (
  id           text                      primary key,
  entity_type  validation_sla_entity_type not null,
  entity_id    text                       not null,
  submitted_at timestamptz                not null,
  deadline_at  timestamptz                not null,
  completed_at timestamptz,
  is_overdue   boolean                    not null default false,
  created_at   timestamptz                not null default now(),
  reviewer_id  text                       references users(id) on delete set null
);

create index if not exists idx_validation_slas_entity on validation_slas (entity_type, entity_id);
create index if not exists idx_validation_slas_is_overdue on validation_slas (is_overdue);
create index if not exists idx_validation_slas_deadline on validation_slas (deadline_at);
create index if not exists idx_validation_slas_reviewer_id on validation_slas (reviewer_id);

alter table validation_slas enable row level security;

-- rls policies for validation slas
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "validation_slas_select_tc"
  on validation_slas for select
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );

create policy "validation_slas_insert_tc"
  on validation_slas for insert
  to authenticated
  with check (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );

create policy "validation_slas_update_tc"
  on validation_slas for update
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  )
  with check (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );
