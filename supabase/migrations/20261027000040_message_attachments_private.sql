-- =====================================================================
-- DAT-SEC : Bucket message-attachments en privé (cohérence SEC-006)
-- Orchestrateur, 2026-10-27 — suite à l'audit 5-a :
-- le bucket `message-attachments` est traité comme privé par le code
-- (signStorageUrl) mais restait public=true en base (migration
-- 20260522000002). On aligne la base sur le contrat applicatif.
-- Idempotent : ne fait rien si le bucket est absent ou déjà privé.
-- =====================================================================

DO $$
DECLARE
  v_bucket text := 'message-attachments';
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = v_bucket AND public = true) THEN
    UPDATE storage.buckets SET public = false WHERE id = v_bucket;

    -- Supprime les policies de lecture publique si elles existent
    DELETE FROM storage.policies
    WHERE bucket_id = v_bucket
      AND name IN ('public read message attachments', 'Public read access');

    -- Policy de lecture authentifiée par défaut (les accès métier passent
    -- par URLs signées service_role, comme les autres buckets privés)
    INSERT INTO storage.policies (bucket_id, name, definition, check)
    VALUES (
      v_bucket,
      'authenticated read message attachments',
      'auth.role() = ''authenticated''',
      'auth.role() = ''authenticated'''
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Bucket % passé en privé', v_bucket;
  ELSE
    RAISE NOTICE 'Bucket % absent ou déjà privé — rien à faire', v_bucket;
  END IF;
END $$;
