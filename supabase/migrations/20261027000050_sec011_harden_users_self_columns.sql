-- ============================================================================
-- SEC-011 — Verrouillage des colonnes sensibles en auto-édition (public.users)
-- Task ID: 6-a · Agent: 🔒 DEV SECURITÉ + ⚙️ DEVOPS + 💾 DEV FULLSTACK
-- ============================================================================
-- Constat d'audit : la policy `users_update_own` (20260518131902, lignes 82-86)
-- n'a aucune restriction de colonnes et le trigger SEC-004
-- (20261027000000, `trg_users_guard_role`) ne garde que `role` / `active_role`.
-- Un utilisateur authentifié peut donc exécuter, via l'API REST PostgREST :
--
--     PATCH /rest/v1/users?id=eq.<soi> {"oneci_verified": true, "nni": "..."}
--
-- et s'auto-valider ONECI / NeoFace, vérifier son email/téléphone ou forcer un
-- `password_hash` SANS passer par les vérifications RNPP / OTP côté serveur.
--
-- Approche : on renforce le trigger (cohérent avec SEC-004, un seul point de
-- garde) via CREATE OR REPLACE FUNCTION + re-pose du trigger. La policy
-- `users_update_own` reste inchangée (l'édition de soi pour les colonnes de
-- profil banales — first_name, avatar_url, address… — doit continuer de
-- fonctionner) ; ce sont les COLONNES sensibles qui deviennent non modifiables
-- par un JWT utilisateur.
--
-- Colonnes gardées (noms vérifiés dans 20260518131902_create_users.sql) :
--   - nni                   : identifiant RNPP (preuve d'identité)
--   - oneci_verified        : statut de vérification d'identité ONECI
--   - oneci_verified_at     : horodatage de la vérification ONECI
--   - neoface_verified      : statut de vérification biométrique NeoFace
--   - neoface_verified_at   : horodatage de la vérification NeoFace
--   - kyc_document_id       : référence du document KYC validé
--   - is_email_verified     : statut email (posé uniquement après OTP serveur)
--   - is_phone_verified     : statut téléphone (posé uniquement après OTP SMS)
--   - password_hash         : hash bcrypt du mot de passe
-- NB : les colonnes `encrypted_password` et `kyc_status` évoquées par l'audit
-- n'existent PAS dans le schéma (vérifié par rg dans supabase/migrations/) —
-- elles sont mentionnées ici pour traçabilité de l'audit.
--
-- ── Flux légitimes qui écrivent ces colonnes (TOUS en service_role) ─────────
-- (le service_role et l'accès direct DB passent la garde, ils ne sont pas
--  affectés ; listés ici pour la revue)
--   1. Inscription + conversion profil temporaire : src/app/api/auth/register/
--      route.ts (~ligne 221) — is_phone_verified, password_hash (service_role).
--   2. Vérification SMS OTP : src/app/api/auth/verify-sms-otp/route.ts
--      (~ligne 112) — is_phone_verified = true.
--   3. Vérification téléphone (OTP classique) : src/app/api/auth/
--      verify-phone-otp/route.ts (~ligne 76) — is_phone_verified = true.
--   4. Vérification email OTP : src/app/api/auth/verify-email-otp/route.ts
--      (~ligne 73) — is_email_verified = true.
--   5. Réinitialisation mot de passe : src/app/api/auth/reset-password/
--      route.ts (~ligne 156) — password_hash, password_updated_at.
--   6. Vérification RNPP (self-service contrôlée serveur) : src/app/api/oneci/
--      verify/route.ts (~ligne 49) — oneci_verified, oneci_verified_at, nni.
--   7. Décision manuelle TIERS_CONFIANCE : src/app/api/tc/oneci/route.ts
--      (~ligne 151) — oneci_verified / neoface_verified.
--   8. Administration : src/app/api/admin/users/route.ts (~ligne 121).
--   9. KYC facial (Edge, client service_role) : supabase/functions/
--      kyc-face-auth/index.ts (lignes 131, 282, 395, 421) — neoface_verified,
--      kyc_document_id.
--  10. KYC ONECI / RNPP (Edge, service_role) : supabase/functions/
--      oneci-face-auth/index.ts (~ligne 95), supabase/functions/
--      oneci-match/index.ts (~ligne 119).
--
-- Idempotence : CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS /
-- CREATE TRIGGER + DROP POLICY IF EXISTS.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Fonction de garde étendue (remplace la version SEC-004, même signature)
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

  -- Requête authentifiée par la clé service_role (backend applicatif, Edge
  -- Functions, webhooks ONECI) : OK — cf. liste des flux légitimes en tête.
  if coalesce(auth.role(), 'anon') = 'service_role' then
    return coalesce(new, old);
  end if;

  -- JWT utilisateur (anon / authenticated) :
  --   - INSERT : création de profil interdite (passe par le serveur — SEC-004) ;
  --   - UPDATE : toute modification de role / active_role est une escalade
  --     (SEC-004).
  if tg_op = 'INSERT'
     or new.role is distinct from old.role
     or new.active_role is distinct from old.active_role then
    raise exception
      'users: creation de profil ou modification de role/active_role reservee au service_role (SEC-004)'
      using errcode = '42501'; -- insufficient_privilege
  end if;

  -- SEC-011 — UPDATE : les colonnes portant une preuve de vérification
  -- (identité, email, téléphone) ou un secret (hash de mot de passe) ne sont
  -- modifiables que par le service_role. Un utilisateur légitime passe
  -- toujours par les routes serveur listées en tête de fichier.
  if tg_op = 'UPDATE' and (
       new.nni                   is distinct from old.nni
    or new.oneci_verified        is distinct from old.oneci_verified
    or new.oneci_verified_at     is distinct from old.oneci_verified_at
    or new.neoface_verified      is distinct from old.neoface_verified
    or new.neoface_verified_at   is distinct from old.neoface_verified_at
    or new.kyc_document_id       is distinct from old.kyc_document_id
    or new.is_email_verified     is distinct from old.is_email_verified
    or new.is_phone_verified     is distinct from old.is_phone_verified
    or new.password_hash         is distinct from old.password_hash
  ) then
    raise exception
      'users: modification des colonnes de verification/kyc reservee au service_role (SEC-011)'
      using errcode = '42501'; -- insufficient_privilege
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Re-pose du trigger (idempotent : DROP IF EXISTS + CREATE)
-- ---------------------------------------------------------------------------
drop trigger if exists trg_users_guard_role on public.users;

create trigger trg_users_guard_role
  before insert or update on public.users
  for each row
  execute function public.prevent_users_privilege_escalation();

-- ---------------------------------------------------------------------------
-- 3) Documentation : la policy users_update_own reste ouverte sur les colonnes
--    de profil banales ; la restriction des colonnes sensibles est portée par
--    le trigger ci-dessus (un seul point de garde, cohérent avec SEC-004).
-- ---------------------------------------------------------------------------
comment on policy users_update_own on public.users is
  'SEC-011 : edition de soi limitee aux colonnes de profil banales - les colonnes de verification (oneci/neoface/email/phone/nni/kyc_document_id) et password_hash sont gardees par le trigger trg_users_guard_role.';
comment on function public.prevent_users_privilege_escalation() is
  'SEC-004 + SEC-011 : empeche tout JWT utilisateur (anon/authenticated) de creer un profil, de modifier role/active_role ou les colonnes de verification/kyc/password sur public.users. service_role et acces direct DB autorises.';
