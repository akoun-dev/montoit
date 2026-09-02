-- 20260617000000_unique_rental_file_applications.sql
-- Garantir qu'un locataire n'a qu'un seul DRAFT et qu'une seule candidature active par bien

-- ─── 1. Restore one-DRAFT-per-tenant index ────────────────────────────────
-- Empêche la création de DRAFTs en double (race condition, double-clic)
create unique index if not exists idx_rental_files_one_draft_per_tenant
  on rental_files (tenant_id) where status = 'DRAFT';

-- ─── 2. Unique active application per tenant + property ───────────────────
-- Empêche les candidatures en double sur le même bien (code 23505 si violé)
create unique index if not exists idx_applications_active_per_property
  on applications (tenant_id, property_id) where status in ('DRAFT', 'SUBMITTED');
