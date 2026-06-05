-- 20260525000001_locataire_features.sql
-- Features: multi-dossier, lease renewal

-- ─── 1. Drop one-draft constraint (multi-dossier) ───────────────────────────
drop index if exists idx_rental_files_one_draft_per_tenant;

-- ─── 2. Lease renewal fields ────────────────────────────────────────────────
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
