-- Deposit refund at lease termination had no model at all: no decision
-- flow, no amount tracked, no justification, no notification — the deposit
-- payment (CAUTION-<leaseId>) just sat there forever with no next step.

create table if not exists deposit_refunds (
  id               text        primary key,
  lease_id         text        not null unique references leases(id) on delete cascade,
  deposit_amount   real        not null,
  refund_amount    real,
  deductions       real        not null default 0,
  deduction_reason text,
  justification_url text,
  status           text        not null default 'PENDING' check (status in ('PENDING', 'DECIDED', 'PAID')),
  decided_by_id    text        references users(id) on delete set null,
  decided_at       timestamptz,
  paid_at          timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_deposit_refunds_lease_id on deposit_refunds (lease_id);
create index if not exists idx_deposit_refunds_status on deposit_refunds (status);

alter table deposit_refunds enable row level security;

create trigger trg_deposit_refunds_updated_at
  before update on deposit_refunds
  for each row
  execute function update_updated_at_column();

create policy "deposit_refunds_select_participant"
  on deposit_refunds for select
  to authenticated
  using (
    exists (
      select 1 from leases
      where id = lease_id and (tenant_id = (select auth.uid()::text) or owner_id = (select auth.uid()::text))
    )
  );

create policy "deposit_refunds_select_admin"
  on deposit_refunds for select
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );

create policy "deposit_refunds_update_owner"
  on deposit_refunds for update
  to authenticated
  using (
    exists (select 1 from leases where id = lease_id and owner_id = (select auth.uid()::text))
  )
  with check (
    exists (select 1 from leases where id = lease_id and owner_id = (select auth.uid()::text))
  );
