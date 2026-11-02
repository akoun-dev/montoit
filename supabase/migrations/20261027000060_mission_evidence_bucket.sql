-- ============================================================================
-- TC-003 — Bucket privé `mission-evidence` (preuves photos des missions TC)
-- Task ID: 6-b · Agent: DEV BACKEND · Sprint 4 (wave 2) · Branche 4.0.0
-- ============================================================================
-- Les agents de terrain (sans compte, spec TC-001 Option C) photographient le
-- bien pendant leur mission et remontent les preuves via la route publique
-- POST /api/missions-token/[token]/upload. Ces photos sont sensibles (intérieurs
-- de biens, occupants éventuels) : bucket PRIVÉ aligné SEC-006 (cf. migration
-- 20261027000001, modèle de style 20260521100000 pour la création de buckets).
--
-- Modèle d'accès retenu (principe « service_role partout » — TC-003) :
--   1. ÉCRITURE : uniquement via le backend (service_role, qui contourne la
--      RLS storage par design) — aucune policy INSERT/UPDATE/DELETE pour
--      anon/authenticated, aucun accès client direct au bucket.
--   2. LECTURE : uniquement via URLs signées générées par le service_role
--      (TTL court) pour le TC propriétaire de la mission concernée — aucune
--      policy SELECT : une policy absente = accès refusé par défaut (RLS).
--   → Surface client : zéro policy = fail-closed, aucune configuration
--     client ne peut exposer le bucket par erreur.
--
-- Chemins applicatifs : `missions/<mission_id>/<uuid>.<ext>` (imposé par la
-- route d'upload ; la contrainte « le path doit appartenir à la mission du
-- token » est vérifiée côté route POST /api/missions-token/[token]).
--
-- Contraintes bucket (défense en profondeur, redondantes avec la validation
-- serveur de la route d'upload) : 5 Mo max, mimes JPEG / PNG / WEBP.
--
-- Idempotent : INSERT ... ON CONFLICT (id) DO UPDATE (aligne un bucket
-- préexistant sur le contrat privé), policies inexistantes par construction.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Bucket privé (5 Mo, JPEG/PNG/WEBP)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mission-evidence',
  'mission-evidence',
  false,
  5242880, -- 5 Mo (contrat upload TC-003 : 413 au-delà)
  '{"image/jpeg", "image/jpg", "image/png", "image/webp"}'
)
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 2) AUCUNE policy storage pour anon/authenticated sur ce bucket.
--    RLS storage activée (migration initiale Supabase) : sans policy, tout
--    accès client (anon ou authenticated) est refusé. Toutes les lectures
--    passent par createSignedUrl côté serveur (service_role), toutes les
--    écritures par storage.from('mission-evidence').upload() côté serveur.
-- ---------------------------------------------------------------------------

-- Filet de sécurité idempotent : si une policy contenant ce bucket avait été
-- créée par erreur (copier-coller d'un autre bucket), on la retire.
delete from storage.policies
where bucket_id = 'mission-evidence';

-- ---------------------------------------------------------------------------
-- 3) Contrôle final : le bucket doit être privé (garde-fou, style 20261027000040)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_bucket text := 'mission-evidence';
  v_public boolean;
BEGIN
  SELECT b."public" INTO v_public FROM storage.buckets b WHERE b.id = v_bucket;
  IF v_public IS NULL THEN
    RAISE EXCEPTION 'Bucket % absent après création — migration à inspecter', v_bucket;
  ELSIF v_public THEN
    RAISE EXCEPTION 'Bucket % encore public — le contrat SEC-006 exige un bucket privé', v_bucket;
  ELSE
    RAISE NOTICE 'Bucket % créé/vérifié privé (0 policy client, accès service_role uniquement)', v_bucket;
  END IF;
END $$;
