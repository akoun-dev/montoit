-- 022_payments.sql
-- Rent payments with Intouch mobile money gateway integration.
-- Tracks due dates, payment status, operator transaction data.

create table if not exists payments (
  id                      text            primary key,
  amount                  real            not null,
  status                  payment_status  not null default 'PENDING',
  due_date                timestamptz     not null,
  paid_at                 timestamptz,
  reference               text,
  method                  payment_method,
  operator_transaction_id text,
  operator_phone_number   text,
  payment_operator_data   jsonb,
  created_at              timestamptz     not null default now(),
  updated_at              timestamptz     not null default now(),
  lease_id                text            not null references leases(id) on delete cascade,
  tenant_id               text            not null references users(id) on delete cascade
);

create index if not exists idx_payments_lease_id on payments (lease_id);
create index if not exists idx_payments_tenant_id on payments (tenant_id);
create index if not exists idx_payments_status on payments (status);
create index if not exists idx_payments_due_date on payments (due_date);
create index if not exists idx_payments_method on payments (method);

alter table payments enable row level security;

create trigger trg_payments_updated_at
  before update on payments
  for each row
  execute function update_updated_at_column();

-- rls policies for payments
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "payments_select_tenant"
  on payments for select
  to authenticated
  using ((select auth.uid()::text) = tenant_id);

create policy "payments_select_owner"
  on payments for select
  to authenticated
  using (
    exists (
      select 1 from leases
      where id = lease_id and owner_id = (select auth.uid()::text)
    )
  );

create policy "payments_insert_admin"
  on payments for insert
  to authenticated
  with check (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );

create policy "payments_update_admin"
  on payments for update
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  )
  with check (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );

alter publication supabase_realtime add table payments;
