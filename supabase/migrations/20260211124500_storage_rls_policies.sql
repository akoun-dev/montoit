-- Migration: Storage RLS policies for app buckets
-- Description: Allow authenticated users to upload/read their own files in allowed buckets

DO $$
DECLARE
  policy_exists boolean;
BEGIN
  IF to_regnamespace('storage') IS NULL THEN
    RAISE NOTICE 'Storage schema not found; skipping RLS policy creation.';
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'storage_authenticated_select_own'
  ) INTO policy_exists;
  IF NOT policy_exists THEN
    EXECUTE $policy$
      CREATE POLICY storage_authenticated_select_own
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (bucket_id = ANY (ARRAY[
        'avatars','documents','verifications','property-images','maintenance-photos','review-photos',
        'dossiers-locataires','dossiers-proprietaires','dossiers-agences','owner-documents',
        'message-attachments','support-attachments'
      ]) AND owner = auth.uid())
    $policy$;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'storage_authenticated_insert_own'
  ) INTO policy_exists;
  IF NOT policy_exists THEN
    EXECUTE $policy$
      CREATE POLICY storage_authenticated_insert_own
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = ANY (ARRAY[
        'avatars','documents','verifications','property-images','maintenance-photos','review-photos',
        'dossiers-locataires','dossiers-proprietaires','dossiers-agences','owner-documents',
        'message-attachments','support-attachments'
      ]) AND owner = auth.uid())
    $policy$;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'storage_authenticated_update_own'
  ) INTO policy_exists;
  IF NOT policy_exists THEN
    EXECUTE $policy$
      CREATE POLICY storage_authenticated_update_own
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = ANY (ARRAY[
        'avatars','documents','verifications','property-images','maintenance-photos','review-photos',
        'dossiers-locataires','dossiers-proprietaires','dossiers-agences','owner-documents',
        'message-attachments','support-attachments'
      ]) AND owner = auth.uid())
      WITH CHECK (bucket_id = ANY (ARRAY[
        'avatars','documents','verifications','property-images','maintenance-photos','review-photos',
        'dossiers-locataires','dossiers-proprietaires','dossiers-agences','owner-documents',
        'message-attachments','support-attachments'
      ]) AND owner = auth.uid())
    $policy$;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'storage_authenticated_delete_own'
  ) INTO policy_exists;
  IF NOT policy_exists THEN
    EXECUTE $policy$
      CREATE POLICY storage_authenticated_delete_own
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = ANY (ARRAY[
        'avatars','documents','verifications','property-images','maintenance-photos','review-photos',
        'dossiers-locataires','dossiers-proprietaires','dossiers-agences','owner-documents',
        'message-attachments','support-attachments'
      ]) AND owner = auth.uid())
    $policy$;
  END IF;
END $$;

-- RPC: Certify property ANSUT (used by trust agents)
CREATE OR REPLACE FUNCTION public.certify_property_ansut(
  p_property_id uuid,
  p_ansut_verified boolean,
  p_ansut_verification_date timestamptz,
  p_ansut_certificate_url text
)
RETURNS public.properties
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_type user_type;
  v_result public.properties;
BEGIN
  SELECT user_type
    INTO v_user_type
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_user_type IS NULL OR v_user_type NOT IN ('trust_agent'::user_type, 'admin'::user_type) THEN
    RAISE EXCEPTION 'Not authorized to certify properties';
  END IF;

  UPDATE public.properties
  SET
    ansut_verified = p_ansut_verified,
    ansut_verification_date = CASE WHEN p_ansut_verified THEN p_ansut_verification_date ELSE NULL END,
    ansut_certificate_url = CASE WHEN p_ansut_verified THEN p_ansut_certificate_url ELSE NULL END,
    is_verified = CASE WHEN p_ansut_verified THEN true ELSE is_verified END,
    updated_at = now()
  WHERE id = p_property_id
  RETURNING * INTO v_result;

  IF v_result.id IS NULL THEN
    RAISE EXCEPTION 'Property not found';
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.certify_property_ansut(uuid, boolean, timestamptz, text) TO authenticated;
