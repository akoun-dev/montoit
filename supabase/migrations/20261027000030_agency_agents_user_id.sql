-- ============================================================================
-- DAT-005 — user_id sur public.agency_agents (liaison agent agence ↔ users)
-- Task ID: 5-e · Agent: DEV DATA · Sprint 3 (wave 2) · Branche 4.0.0
-- ============================================================================
-- Problème (analyse 1-b §5.3 dette #1 + TC-001 spec §6.4) : les agents
-- d'agence (agency_agents) n'ont AUCUN lien vers public.users — ils ne
-- peuvent ni se connecter, ni être tracés individuellement (RLS, audit_logs).
-- Contrairement aux agents de terrain TC (missions éphémères via tokens,
-- Option C), les agents d'agence gèrent un portefeuille DURABLE (biens
-- assignés, mandats, candidatures) → ils ont besoin d'un compte : modèle
-- "user_id" (Option A appliquée à agency_agents).
--
-- Cette migration :
--   1. Ajoute la colonne user_id (NULLABLE pour la transition : les agents
--      existants n'ont pas de compte, la liaison est faite agent par agent
--      via /api/agence/agents).
--   2. Pose une contrainte d'unicité PARTIELLE UNIQUE(user_id)
--      WHERE user_id IS NOT NULL : un compte users ne peut être lié qu'à
--      UN SEUL agent agence à la fois (anti-partage de compte, traçabilité
--      individuelle garantie). L'index unique partiel sert également
--      d'index de recherche sur user_id (pas d'index redondant ajouté).
--   3. Documente la colonne (comment on column).
--
-- Type : public.users.id est un text (migration 20260518131902) → user_id
-- est typé text, comme toutes les FK vers users (agency_id, tc_id…).
-- Idempotence : add column if not exists + create unique index if not exists.
-- ============================================================================

-- 1) Colonne user_id nullable, FK vers users avec on delete set null :
--    la suppression du compte utilisateur ne supprime PAS l'agent (données
--    métier de l'agence) — la liaison est simplement retirée.
alter table public.agency_agents
  add column if not exists user_id text
  references public.users(id)
  on delete set null;

-- 2) Unicité partielle : au plus un agent actif par compte utilisateur.
--    (Un index unique partiel remplit aussi le rôle d'index de lookup.)
create unique index if not exists uniq_agency_agents_user_id
  on public.agency_agents (user_id)
  where user_id is not null;

-- 3) Documentation de la colonne (visible dans pg_dump / Supabase Studio).
comment on column public.agency_agents.user_id is
  'DAT-005 : compte users lie a cet agent agence (nullable pour la transition - les agents existants n''ont pas de compte). Unique partiellement : un compte ne peut etre lie qu''a un seul agent. Suppression du compte -> user_id remis a null (on delete set null).';
