-- 023_disputes.sql
-- Dispute/litigation tracking between tenant and owner.
-- Supports escalation workflow with Tiers de Confiance handling.

create table if not exists disputes (
  id                  text            primary key,
  type                dispute_type    not null,
  description         text            not null,
  status              dispute_status  not null default 'OPEN',
  priority            dossier_priority not null default 'NORMAL',
  resolution          text,
  tc_comment          text,
  investigation_notes text,
  evidence_urls       text            not null default '[]',
  is_escalated        boolean         not null default false,
  escalated_at        timestamptz,
  escalation_reason   text,
  created_at          timestamptz     not null default now(),
  updated_at          timestamptz     not null default now(),
  lease_id            text            not null references leases(id) on delete cascade,
  reported_by_id      text            not null references users(id) on delete cascade,
  resolved_by_id      text            references users(id) on delete set null,
  handled_by_id       text            references users(id) on delete set null
);

create index if not exists idx_disputes_lease_id on disputes (lease_id);
create index if not exists idx_disputes_status on disputes (status);
create index if not exists idx_disputes_reported_by_id on disputes (reported_by_id);
create index if not exists idx_disputes_handled_by_id on disputes (handled_by_id);
create index if not exists idx_disputes_is_escalated on disputes (is_escalated);
create index if not exists idx_disputes_priority on disputes (priority);

alter table disputes enable row level security;

create trigger trg_disputes_updated_at
  before update on disputes
  for each row
  execute function update_updated_at_column();

-- rls policies for disputes
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "disputes_select_participant"
  on disputes for select
  to authenticated
  using (
    (select auth.uid()::text) = reported_by_id
    or exists (
      select 1 from leases
      where id = lease_id and (select auth.uid()::text) in (tenant_id, owner_id)
    )
  );

create policy "disputes_select_tc"
  on disputes for select
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );

create policy "disputes_insert_participant"
  on disputes for insert
  to authenticated
  with check (
    (select auth.uid()::text) = reported_by_id
  );

create policy "disputes_update_tc"
  on disputes for update
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  )
  with check (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );
