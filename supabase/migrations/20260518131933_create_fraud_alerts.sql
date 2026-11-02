-- 033_fraud_alerts.sql
-- Fraud alert tracking for suspicious user activity.
-- Can be auto-detected by the system or manually reported by TC.

create table if not exists fraud_alerts (
  id            text              primary key,
  status        fraud_alert_status not null default 'OPEN',
  description   text              not null,
  auto_detected boolean           not null default false,
  resolution    text,
  created_at    timestamptz       not null default now(),
  updated_at    timestamptz       not null default now(),
  suspect_id    text              not null references users(id) on delete cascade,
  reporter_id   text              not null references users(id) on delete cascade
);

create index if not exists idx_fraud_alerts_suspect_id on fraud_alerts (suspect_id);
create index if not exists idx_fraud_alerts_reporter_id on fraud_alerts (reporter_id);
create index if not exists idx_fraud_alerts_status on fraud_alerts (status);
create index if not exists idx_fraud_alerts_auto_detected on fraud_alerts (auto_detected);

alter table fraud_alerts enable row level security;

create trigger trg_fraud_alerts_updated_at
  before update on fraud_alerts
  for each row
  execute function update_updated_at_column();

-- rls policies for fraud alerts
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "fraud_alerts_select_tc"
  on fraud_alerts for select
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );

create policy "fraud_alerts_insert_tc"
  on fraud_alerts for insert
  to authenticated
  with check (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );

create policy "fraud_alerts_update_tc"
  on fraud_alerts for update
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  )
  with check (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );
