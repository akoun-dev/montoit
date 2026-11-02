-- ============================================================================
-- SEC-004 — Durcissement RLS de la table public.users
-- Task ID: 4-b · Agent: DEV FULLSTACK DATA · Sprint 0 (sécurité) · Sprint 4.0.0
-- ============================================================================
-- Corrige la vulnérabilité V4 de l'analyse 1-c (backend/sécurité) :
--
--   1. La policy `users_insert_anon` (migration 20260518131902) autorisait
--      `with check (true)` : n'importe quelle requête portant la clé anon
--      (publique par nature) pouvait insérer un profil avec `role='ADMIN'`
--      et un `password_hash` arbitraire.
--      => La création de profil se fait UNIQUEMENT côté serveur via le client
--         service_role (route /api/auth/register, vérifications OTP), qui
--         contourne la RLS par design. La policy anon devient `with check (false)`.
--
--   2. La policy `users_update_own` ne restreignait aucune colonne : tout
--      utilisateur authentifié pouvait exécuter `UPDATE users SET role='ADMIN'`
--      via l'API REST Supabase, sans passer par l'application.
--      => Un trigger BEFORE INSERT/UPDATE interdit désormais à toute requête
--         portant un JWT utilisateur (anon / authenticated) de créer un profil
--         ou de modifier les colonnes privilégiées `role` / `active_role`.
--         Seuls passent : la clé service_role (API serveur) et l'accès direct
--         à la base (migrations, psql, jobs SQL — aucun JWT présent).
--
-- Idempotence : DROP POLICY IF EXISTS, CREATE OR REPLACE FUNCTION et guard
-- sur pg_trigger pour la (re)création du trigger.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Fermeture de la policy INSERT anon (check(true) -> check(false))
-- ---------------------------------------------------------------------------
drop policy if exists users_insert_anon on public.users;

-- Aucun client anon ne peut insérer de profil : l'inscription passe par les
-- routes serveur (service_role), qui contournent la RLS.
create policy users_insert_anon
  on public.users
  for insert
  to anon
  with check (false);

-- ---------------------------------------------------------------------------
-- 2) Fonction de garde anti-escalade de privilèges
--    Bloque INSERT et tout UPDATE de role/active_role pour les JWT utilisateur.
-- ---------------------------------------------------------------------------
create or replace function public.prevent_users_privilege_escalation()
returns trigger
language plpgsql
as $$
declare
  jwt_claims text;
begin
  jwt_claims := current_setting('request.jwt.claims', true);

  -- Pas de contexte JWT : accès direct à la base (migrations, psql, crons SQL).
  -- Cet accès est déjà privilégié par nature : on laisse passer pour ne pas
  -- casser les opérations d'infrastructure.
  if jwt_claims is null or jwt_claims = '' then
    return coalesce(new, old);
  end if;

  -- Requête authentifiée par la clé service_role (backend applicatif) : OK.
  if coalesce(auth.role(), 'anon') = 'service_role' then
    return coalesce(new, old);
  end if;

  -- JWT utilisateur (anon / authenticated) :
  --   - INSERT : création de profil interdite (passe par le serveur) ;
  --   - UPDATE : toute modification de role / active_role est une escalade.
  if tg_op = 'INSERT'
     or new.role is distinct from old.role
     or new.active_role is distinct from old.active_role then
    raise exception
      'users: creation de profil ou modification de role/active_role reservee au service_role (SEC-004)'
      using errcode = '42501'; -- insufficient_privilege
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Pose du trigger (guard sur pg_trigger : idempotent)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.users'::regclass
      and tgname = 'trg_users_guard_role'
      and not tgisinternal
  ) then
    create trigger trg_users_guard_role
      before insert or update on public.users
      for each row
      execute function public.prevent_users_privilege_escalation();
  end if;
end
$$;

-- Commentaires de documentation (visibles dans pg_dump / Studio)
comment on policy users_insert_anon on public.users is
  'SEC-004 : insertion anon fermee (with check false) - la creation de profil est serveur uniquement (service_role).';
comment on function public.prevent_users_privilege_escalation() is
  'SEC-004 : empeche tout JWT utilisateur (anon/authenticated) de creer un profil ou de modifier role/active_role sur public.users. service_role et acces direct DB autorises.';
