-- ============================================================================
-- TC-002 — Table public.mission_access_tokens (Option C, spec TC-001 §5.3)
-- Task ID: 5-e · Agent: DEV DATA · Sprint 3 (wave 2) · Branche 4.0.0
-- ============================================================================
-- Les agents de terrain du Tiers de Confiance (verification_agents) n'ont
-- PAS de compte utilisateur (dette #1 de l'analyse 1-b). Décision produit
-- validée (TC-001, arbitrage orchestrateur) : Option C — missions éphémères
-- via tokens sécurisés. Chaque mission porte un lien magique SMS/email
-- (page mobile /m/{token} — sprint suivant, TC-004), le token n'est JAMAIS
-- stocké en clair : SHA-256(token + pepper), même discipline que
-- src/lib/otp-hash.ts (OTP_HASH_PEPPER — cf. DOC-002 / SEC-005).
--
-- Modèle (spec TC-001 §5.3, colonnes opened_at/submitted_at ajoutées pour
-- les badges TC "envoyé / ouvert / rendu" — TC-006) :
--   - mission_id  : FK missions(id) ON DELETE CASCADE (une mission, ses liens)
--   - token_hash  : sha256(token + pepper), UNIQUE — aucune valeur en clair
--   - channel     : SMS | EMAIL (canal d'envoi du lien)
--   - expires_at  : TTL (72 h par défaut côté lib token-access.ts)
--   - opened_at / submitted_at : cycle de vie (ouverture ≠ soumission)
--   - revoked_at  : révocation par le TC (relance = ancien token révoqué)
--   - created_by  : le TC créateur (FK users)
--   - last_used_at : dernier usage du token (télémétrie anti-rejeu)
--
-- Sécurité RLS (exigence TC-002) : le TC créateur + ADMIN gèrent les lignes
-- MAIS personne ne lit token_hash via l'API autre que service_role :
--   1. RLS activée, policy SELECT pour le TC propriétaire de la mission et
--      l'ADMIN (lecture du STATUT du lien uniquement).
--   2. AUCUNE policy INSERT/UPDATE/DELETE pour anon/authenticated : toutes
--      les écritures passent par le backend (service_role, routes
--      /api/tc/missions/[id]/access-link), qui contourne la RLS par design.
--   3. Privilèges colonne : revoked/grant pour que authenticated ne voie
--      PAS la colonne token_hash (ni en SELECT * ni en SELECT nommé) —
--      service_role conserve tous ses droits (grants par défaut Supabase).
--
-- Idempotence : create table if not exists, create index if not exists,
-- drop policy if exists + create policy, revoke/grant ré-exécutables.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Table
-- ---------------------------------------------------------------------------
create table if not exists public.mission_access_tokens (
  id           uuid        primary key default gen_random_uuid(),
  mission_id   text        not null references public.missions(id) on delete cascade,
  token_hash   text        not null,
  channel      text        not null default 'SMS' check (channel in ('SMS', 'EMAIL')),
  expires_at   timestamptz not null,
  opened_at    timestamptz,
  submitted_at timestamptz,
  revoked_at   timestamptz,
  user_agent   text,
  created_by   text        not null references public.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);

-- Unicité du hash : un token = une ligne (lookup serveur par token_hash).
create unique index if not exists uq_mission_access_tokens_token_hash
  on public.mission_access_tokens (token_hash);

-- Lookup des liens d'une mission (badge TC, révocation en masse).
create index if not exists idx_mission_access_tokens_mission_id
  on public.mission_access_tokens (mission_id);

-- Purge / contrôle d'expiration (cron de nettoyage, stats).
create index if not exists idx_mission_access_tokens_expires_at
  on public.mission_access_tokens (expires_at);

-- Historique des liens émis par un TC.
create index if not exists idx_mission_access_tokens_created_by
  on public.mission_access_tokens (created_by);

-- ---------------------------------------------------------------------------
-- 2) RLS : lecture du statut pour le TC créateur + ADMIN ; écritures
--    serveur uniquement (service_role). anon : aucun droit.
-- ---------------------------------------------------------------------------
alter table public.mission_access_tokens enable row level security;

drop policy if exists mission_access_tokens_select_tc_admin on public.mission_access_tokens;
create policy mission_access_tokens_select_tc_admin
  on public.mission_access_tokens for select
  to authenticated
  using (
    exists (
      select 1 from missions m
      where m.id = mission_id
        and m.tc_id = (select auth.uid()::text)
    )
    or exists (
      select 1 from users
      where id = (select auth.uid()::text) and role = 'ADMIN'
    )
  );

-- Pas de policy INSERT/UPDATE/DELETE pour anon/authenticated :
-- refus par défaut (écriture 100 % service_role via routes backend).

-- ---------------------------------------------------------------------------
-- 3) token_hash interdit de lecture aux rôles API (anon/authenticated).
--    La colonne reste lisible par service_role (grants par défaut conservés).
--    Résultat : même un TC propriétaire ne peut pas extraire le hash via
--    supabase-js — seule la couche serveur le manipule.
-- ---------------------------------------------------------------------------
revoke all privileges on table public.mission_access_tokens from anon;
revoke all privileges on table public.mission_access_tokens from authenticated;

grant select (
  id, mission_id, channel, expires_at, opened_at, submitted_at,
  revoked_at, user_agent, created_by, created_at, last_used_at
) on public.mission_access_tokens to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Documentation (visible dans pg_dump / Supabase Studio)
-- ---------------------------------------------------------------------------
comment on table public.mission_access_tokens is
  'TC-002 (Option C) : tokens d''accès éphémères aux missions des agents de terrain TC. Token stocké UNIQUEMENT hashé (sha256 + pepper, cf. src/lib/otp-hash.ts). Écritures via service_role ; lecture API limitée au statut (token_hash masqué par grants colonne).';
comment on column public.mission_access_tokens.token_hash is
  'sha256(token + MISSION_TOKEN_PEPPER) hex — jamais le token en clair. Le token clair n''est retourné qu''une seule fois au TC (POST /api/tc/missions/[id]/access-link).';
comment on column public.mission_access_tokens.expires_at is
  'Expiration du lien (TTL 72 h par défaut, borné 1-168 h côté route).';
comment on column public.mission_access_tokens.revoked_at is
  'Révocation par le TC (relance régénère un token et révoque les anciens).';
