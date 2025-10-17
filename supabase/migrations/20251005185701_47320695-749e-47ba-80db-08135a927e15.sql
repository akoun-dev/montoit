-- ============================================
-- PHASE 3: Sécuriser la table user_verifications (correctif)
-- ============================================

-- Supprimer toutes les anciennes policies
DROP POLICY IF EXISTS "Admins can view all verifications" ON public.user_verifications;
DROP POLICY IF EXISTS "Super admins can view all verifications" ON public.user_verifications;

-- Recréer la policy pour super admins uniquement
CREATE POLICY "Super admins can view all verifications"
ON public.user_verifications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Fonction pour logger les accès aux données de vérification (sans trigger)
CREATE OR REPLACE FUNCTION public.view_user_verification(target_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  oneci_status text,
  cnam_status text,
  oneci_verified_at timestamptz,
  cnam_verified_at timestamptz,
  tenant_score integer,
  admin_review_notes text,
  admin_reviewed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que l'appelant est super_admin
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only super admins can view verification details';
  END IF;
  
  -- Logger l'accès
  INSERT INTO public.admin_audit_logs (
    admin_id,
    action_type,
    target_type,
    target_id,
    notes
  ) VALUES (
    auth.uid(),
    'verification_viewed',
    'user_verification',
    target_user_id,
    'Viewed sensitive verification data'
  );
  
  -- Retourner les données de vérification (sans les données sensibles complètes)
  RETURN QUERY
  SELECT 
    uv.user_id,
    uv.oneci_status,
    uv.cnam_status,
    uv.oneci_verified_at,
    uv.cnam_verified_at,
    uv.tenant_score,
    uv.admin_review_notes,
    uv.admin_reviewed_at
  FROM public.user_verifications uv
  WHERE uv.user_id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.view_user_verification(uuid) TO authenticated;