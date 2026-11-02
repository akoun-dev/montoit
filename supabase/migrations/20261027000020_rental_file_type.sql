-- FUN-002 — Dossiers locatifs multiples pour le LOCATAIRE (Task 5-c)
-- =====================================================================
-- Aujourd'hui : UN seul dossier DRAFT par locataire
--   (index unique partiel idx_rental_files_one_draft_per_tenant sur tenant_id
--    WHERE status = 'DRAFT', créé dans 20260518131908 puis 20260617000000).
-- Objectif : autoriser plusieurs dossiers simultanés (personnel, familial,
-- colocation) — UN seul DRAFT par (locataire, type de dossier).
-- ⚠️ Ne touche PAS à idx_applications_active_per_property : la règle
--   « une seule candidature active par bien » est conservée, tous types confondus.
-- Migration idempotente (ré-exécutable sans erreur).

-- ─── 1. Enum du type de dossier ─────────────────────────────────────────────
-- STANDARD   : dossier personnel (par défaut, backfill des dossiers existants)
-- FAMILLE    : configuration familiale (conjoint / enfants à charge)
-- COLOCATION : dossier pour une colocation
do $$ begin
  create type rental_file_type as enum ('STANDARD', 'FAMILLE', 'COLOCATION');
exception
  when duplicate_object then null; -- déjà créé (ré-exécution)
end $$;

-- ─── 2. Colonne file_type sur rental_files ──────────────────────────────────
-- NOT NULL DEFAULT 'STANDARD' → le backfill est automatique pour les lignes
-- existantes (l'ancienne contrainte garantissait l'unicité, donc aucun risque
-- de doublon après backfill).
alter table rental_files
  add column if not exists file_type rental_file_type not null default 'STANDARD';

-- Backfill défensif (no-op en pratique : colonne NOT NULL avec défaut)
update rental_files
   set file_type = 'STANDARD'
 where file_type is null;

-- ─── 3. Remplacement de l'unicité DRAFT ─────────────────────────────────────
-- Avant : 1 DRAFT par locataire (tous types confondus).
-- Après : 1 DRAFT par (locataire, type) — les 3 types peuvent coexister en DRAFT.
-- Aucun locataire ne peut avoir 2 DRAFT à ce stade (garanti par l'ancien index),
-- donc la création du nouvel index ne peut pas échouer sur des données existantes.
drop index if exists idx_rental_files_one_draft_per_tenant;

create unique index if not exists idx_rental_files_one_draft_per_tenant_and_type
  on rental_files (tenant_id, file_type)
  where status = 'DRAFT';

-- ─── 4. Index de lecture (listes, sélecteur du header, files TC) ────────────
create index if not exists idx_rental_files_tenant_type
  on rental_files (tenant_id, file_type);

-- ─── 5. Documentation ───────────────────────────────────────────────────────
comment on column rental_files.file_type is
  'Type de dossier locatif (STANDARD=personnel, FAMILLE, COLOCATION) — FUN-002';
