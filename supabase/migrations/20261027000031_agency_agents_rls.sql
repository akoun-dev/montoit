-- ============================================================================
-- DAT-005 — RLS de public.agency_agents (lecture élargie + ADMIN)
-- Task ID: 5-e · Agent: DEV DATA · Sprint 3 (wave 2) · Branche 4.0.0
-- ============================================================================
-- État avant migration (migration 20260518131936) : les 4 policies ne
-- donnent accès qu'à l'agence propriétaire (agency_id = auth.uid()).
--
-- Cette migration (DAT-005) :
--   1. Élargit la LECTURE à l'agent concerné lui-même une fois qu'un compte
--      users lui a été lié (agency_agents.user_id, migration 20261027000030) :
--      un agent agence doit pouvoir consulter SA fiche (portefeuille, stats)
--      sans pouvoir la modifier ni voir les autres agents de l'agence.
--   2. Donne l'ADMIN en lecture / insertion / mise à jour (supervision et
--      support plateforme), même pattern que les policies missions/users
--      (join users.role = 'ADMIN').
--   3. Laisse inchangée la policy DELETE (agence propriétaire seule) : le
--      retrait d'un agent est géré applicativement via le statut, et la
--      consigne DAT-005 ne demande pas l'extension du DELETE.
--
-- Patterns RLS repris des tables métier existantes (missions, users —
-- migrations 20260518131931 / 20261027000000) :
--   - (select auth.uid()::text) : utilisateur courant (initcall wrappee) ;
--   - exists (select 1 from users where id = … and role = 'ADMIN') : ADMIN.
-- Idempotence : DROP POLICY IF EXISTS puis CREATE POLICY.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) SELECT : agence propriétaire OU agent concerné (user_id) OU ADMIN
-- ---------------------------------------------------------------------------
drop policy if exists agency_agents_select_agency on public.agency_agents;
create policy agency_agents_select_agency
  on public.agency_agents for select
  to authenticated
  using (
    (select auth.uid()::text) = agency_id
    or exists (
      select 1 from users
      where id = (select auth.uid()::text) and role = 'ADMIN'
    )
    or (
      user_id is not null
      and user_id = (select auth.uid()::text)
    )
  );

-- ---------------------------------------------------------------------------
-- 2) INSERT : agence propriétaire OU ADMIN (l'agent ne se crée pas lui-même)
-- ---------------------------------------------------------------------------
drop policy if exists agency_agents_insert_agency on public.agency_agents;
create policy agency_agents_insert_agency
  on public.agency_agents for insert
  to authenticated
  with check (
    (select auth.uid()::text) = agency_id
    or exists (
      select 1 from users
      where id = (select auth.uid()::text) and role = 'ADMIN'
    )
  );

-- ---------------------------------------------------------------------------
-- 3) UPDATE : agence propriétaire OU ADMIN (l'agent ne modifie pas sa fiche)
-- ---------------------------------------------------------------------------
drop policy if exists agency_agents_update_agency on public.agency_agents;
create policy agency_agents_update_agency
  on public.agency_agents for update
  to authenticated
  using (
    (select auth.uid()::text) = agency_id
    or exists (
      select 1 from users
      where id = (select auth.uid()::text) and role = 'ADMIN'
    )
  )
  with check (
    (select auth.uid()::text) = agency_id
    or exists (
      select 1 from users
      where id = (select auth.uid()::text) and role = 'ADMIN'
    )
  );

-- ---------------------------------------------------------------------------
-- 4) Documentation des policies (visible dans pg_dump / Supabase Studio)
-- ---------------------------------------------------------------------------
comment on policy agency_agents_select_agency on public.agency_agents is
  'DAT-005 : lecture par l''agence propriétaire, l''agent concerné (user_id = auth.uid()) et l''ADMIN.';
comment on policy agency_agents_insert_agency on public.agency_agents is
  'DAT-005 : création réservée à l''agence propriétaire et à l''ADMIN.';
comment on policy agency_agents_update_agency on public.agency_agents is
  'DAT-005 : mise à jour réservée à l''agence propriétaire et à l''ADMIN (l''agent ne modifie pas sa fiche).';
