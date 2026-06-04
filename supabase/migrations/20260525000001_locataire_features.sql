-- 20260525000001_locataire_features.sql
-- Features: search alerts, multi-dossier, lease renewal

-- ─── 1. Drop one-draft constraint (multi-dossier) ───────────────────────────
drop index if exists idx_rental_files_one_draft_per_tenant;

-- ─── 2. Search alerts table ────────────────────────────────────────────────
create table if not exists search_alerts (
  id                text primary key,
  user_id           text not null references users(id) on delete cascade,
  name              text not null,
  search_query      text,
  city              text,
  property_type     text,
  min_price         real,
  max_price         real,
  is_active         boolean not null default true,
  last_notified_at  timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_search_alerts_user_id on search_alerts (user_id);
create index if not exists idx_search_alerts_active on search_alerts (is_active) where is_active = true;

alter table search_alerts enable row level security;

create trigger trg_search_alerts_updated_at
  before update on search_alerts
  for each row
  execute function update_updated_at_column();

create policy "search_alerts_select_own"
  on search_alerts for select
  to authenticated
  using ((select auth.uid()::text) = user_id);

create policy "search_alerts_insert_own"
  on search_alerts for insert
  to authenticated
  with check ((select auth.uid()::text) = user_id);

create policy "search_alerts_update_own"
  on search_alerts for update
  to authenticated
  using ((select auth.uid()::text) = user_id)
  with check ((select auth.uid()::text) = user_id);

create policy "search_alerts_delete_own"
  on search_alerts for delete
  to authenticated
  using ((select auth.uid()::text) = user_id);

-- ─── 3. Lease renewal fields ────────────────────────────────────────────────
alter table leases
  add column if not exists renewal_status          text,
  add column if not exists renewal_requested_at    timestamptz,
  add column if not exists renewal_notes           text,
  add column if not exists renewed_lease_id        text references leases(id) on delete set null;

-- Add CHECK constraint for renewal_status values
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chk_leases_renewal_status'
  ) then
    alter table leases
      add constraint chk_leases_renewal_status
      check (renewal_status in (null, 'REQUESTED', 'ACCEPTED', 'REJECTED', 'RENEWED'));
  end if;
end $$;
