-- ============================================================================
-- PHASE 1: SÉCURITÉ CRITIQUE - Protection données personnelles (FINAL)
-- ============================================================================

-- 1. Vue publique des profils SANS téléphone
DROP VIEW IF EXISTS public.profiles_public CASCADE;
CREATE VIEW public.profiles_public AS
SELECT 
  id, full_name, user_type, city, bio, avatar_url,
  oneci_verified, cnam_verified, face_verified, is_verified,
  created_at, updated_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated, anon;

-- 2. Fonction pour vérifier si admin a 2FA
CREATE OR REPLACE FUNCTION public.admin_has_2fa_enabled(_admin_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.mfa_backup_codes WHERE user_id = _admin_id LIMIT 1);
$$;

-- 3. Renforcer get_verifications_for_admin_review avec 2FA obligatoire
CREATE OR REPLACE FUNCTION public.get_verifications_for_admin_review()
RETURNS TABLE(
  user_id uuid, full_name text, user_type user_type, city text,
  oneci_status text, oneci_cni_number text, oneci_data jsonb, oneci_verified_at timestamptz,
  cnam_status text, cnam_social_security_number text, cnam_employer text, cnam_data jsonb, cnam_verified_at timestamptz,
  face_verification_status text, face_similarity_score numeric, face_verified_at timestamptz,
  admin_review_notes text, admin_reviewed_at timestamptz, admin_reviewed_by uuid,
  created_at timestamptz, updated_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only super admins can access full verification data';
  END IF;
  
  IF NOT public.admin_has_2fa_enabled(auth.uid()) THEN
    INSERT INTO public.admin_audit_logs (admin_id, action_type, target_type, target_id, notes)
    VALUES (auth.uid(), 'sensitive_data_access_blocked_no_2fa', 'user_verification', auth.uid(),
            'Admin attempted access without 2FA');
    RAISE EXCEPTION 'Two-factor authentication required. Enable 2FA in profile settings.';
  END IF;
  
  INSERT INTO public.sensitive_data_access_log (requester_id, target_user_id, data_type, access_granted, relationship_type, metadata)
  VALUES (auth.uid(), NULL, 'verification_admin_queue', true, 'super_admin',
          jsonb_build_object('action', 'admin_review_queue_accessed', 'has_2fa', true));
  
  RETURN QUERY
  SELECT uv.user_id, p.full_name, p.user_type, p.city,
    uv.oneci_status, uv.oneci_cni_number, uv.oneci_data, uv.oneci_verified_at,
    uv.cnam_status, uv.cnam_social_security_number, uv.cnam_employer, uv.cnam_data, uv.cnam_verified_at,
    uv.face_verification_status, uv.face_similarity_score, uv.face_verified_at,
    uv.admin_review_notes, uv.admin_reviewed_at, uv.admin_reviewed_by, uv.created_at, uv.updated_at
  FROM public.user_verifications uv
  JOIN public.profiles p ON p.id = uv.user_id
  WHERE uv.oneci_status = 'pending_review' OR uv.cnam_status = 'pending_review';
END;
$$;

-- 4. Fonction profil public SANS téléphone
DROP FUNCTION IF EXISTS public.get_public_profile(uuid);
CREATE FUNCTION public.get_public_profile(target_user_id uuid)
RETURNS TABLE(
  id uuid, full_name text, user_type user_type, city text, bio text, avatar_url text,
  oneci_verified boolean, cnam_verified boolean, face_verified boolean, is_verified boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.user_type, p.city, p.bio, p.avatar_url,
    p.oneci_verified, p.cnam_verified, p.face_verified, p.is_verified
  FROM public.profiles p WHERE p.id = target_user_id;
$$;

-- 5. Renforcer RLS profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own complete profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view profiles metadata" ON public.profiles;

CREATE POLICY "Users can view their own complete profile"
ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admins can view profiles metadata"  
ON public.profiles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 6. Vue monitoring accès sensibles
DROP VIEW IF EXISTS public.sensitive_data_access_monitoring CASCADE;
CREATE VIEW public.sensitive_data_access_monitoring AS
SELECT 
  sdal.id, sdal.requester_id, pr.full_name as requester_name,
  sdal.target_user_id, pt.full_name as target_name,
  sdal.data_type, sdal.access_granted, sdal.relationship_type,
  sdal.metadata, sdal.accessed_at,
  CASE 
    WHEN sdal.metadata->>'has_2fa' = 'true' THEN '✓ 2FA'
    WHEN sdal.metadata->>'has_2fa' = 'false' THEN '✗ NO 2FA'
    ELSE 'N/A'
  END as mfa_status
FROM public.sensitive_data_access_log sdal
LEFT JOIN public.profiles pr ON pr.id = sdal.requester_id
LEFT JOIN public.profiles pt ON pt.id = sdal.target_user_id
ORDER BY sdal.accessed_at DESC;

GRANT SELECT ON public.sensitive_data_access_monitoring TO authenticated;

DROP POLICY IF EXISTS "Only super admins can view sensitive data monitoring" ON public.sensitive_data_access_log;
CREATE POLICY "Only super admins can view sensitive data monitoring"
ON public.sensitive_data_access_log FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- 7. Détection accès suspects
CREATE OR REPLACE FUNCTION public.detect_suspicious_sensitive_data_access()
RETURNS TABLE(
  admin_id uuid, admin_name text, access_count bigint, data_types text[],
  has_2fa boolean, first_access timestamptz, last_access timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only super admins can detect suspicious access';
  END IF;

  RETURN QUERY
  SELECT sdal.requester_id, p.full_name, COUNT(*)::bigint,
    array_agg(DISTINCT sdal.data_type),
    bool_and(COALESCE((sdal.metadata->>'has_2fa')::boolean, false)),
    MIN(sdal.accessed_at), MAX(sdal.accessed_at)
  FROM public.sensitive_data_access_log sdal
  JOIN public.profiles p ON p.id = sdal.requester_id
  WHERE sdal.accessed_at > now() - interval '1 hour'
    AND sdal.data_type IN ('verification_data', 'verification_admin_queue', 'phone')
  GROUP BY sdal.requester_id, p.full_name
  HAVING COUNT(*) > 20
  ORDER BY COUNT(*) DESC;
END;
$$;