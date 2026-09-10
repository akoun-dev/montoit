-- payments.status already allowed 'PARTIAL' but nothing ever set it: there
-- was no amount-paid tracking and no way to make a payment for less than
-- the full amount due, so the status was dead. Add amount_paid to track
-- the running total actually paid, and payment_attempts to log each
-- initiation (the "historique de tentatives" the analysis flagged as
-- missing) — needed because a partial payment's own amount differs from
-- payments.amount (the total due) and must be looked up when its callback
-- arrives.

alter table payments
  add column if not exists amount_paid real not null default 0;

create table if not exists payment_attempts (
  id                      text        primary key,
  payment_id              text        not null references payments(id) on delete cascade,
  amount                  real        not null,
  method                  payment_method,
  operator_transaction_id text,
  partner_transaction_id  text,
  status                  text        not null default 'PROCESSING' check (status in ('PROCESSING', 'SUCCESS', 'FAILED')),
  failure_reason          text,
  created_at              timestamptz not null default now(),
  completed_at            timestamptz
);

create index if not exists idx_payment_attempts_payment_id on payment_attempts (payment_id);
create index if not exists idx_payment_attempts_operator_transaction_id on payment_attempts (operator_transaction_id);

alter table payment_attempts enable row level security;

create policy "payment_attempts_select_tenant"
  on payment_attempts for select
  to authenticated
  using (
    exists (select 1 from payments where id = payment_id and tenant_id = (select auth.uid()::text))
  );

create policy "payment_attempts_select_owner"
  on payment_attempts for select
  to authenticated
  using (
    exists (
      select 1 from payments p
      join leases l on l.id = p.lease_id
      where p.id = payment_id and l.owner_id = (select auth.uid()::text)
    )
  );

create policy "payment_attempts_select_admin"
  on payment_attempts for select
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );
