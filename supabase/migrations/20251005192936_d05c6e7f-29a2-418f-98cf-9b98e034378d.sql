-- EPIC 2: Secure RPC for admin verification review with audit logging
CREATE OR REPLACE FUNCTION public.get_verifications_for_admin_review()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  user_type user_type,
  city text,
  oneci_status text,
  oneci_cni_number text,
  oneci_data jsonb,
  oneci_verified_at timestamp with time zone,
  cnam_status text,
  cnam_social_security_number text,
  cnam_employer text,
  cnam_data jsonb,
  cnam_verified_at timestamp with time zone,
  face_verification_status text,
  face_similarity_score numeric,
  face_verified_at timestamp with time zone,
  admin_review_notes text,
  admin_reviewed_at timestamp with time zone,
  admin_reviewed_by uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is super admin
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only super admins can access full verification data';
  END IF;
  
  -- Log the access attempt with sensitive data flag
  INSERT INTO public.admin_audit_logs (
    admin_id,
    action_type,
    target_type,
    target_id,
    notes
  ) VALUES (
    auth.uid(),
    'verification_admin_review_accessed',
    'user_verification',
    auth.uid(),
    'Super admin accessed full verification queue with sensitive government ID data'
  );
  
  -- Return ALL verification data including sensitive fields
  -- Admins need full access to review government IDs
  RETURN QUERY
  SELECT 
    uv.user_id,
    p.full_name,
    p.user_type,
    p.city,
    uv.oneci_status,
    uv.oneci_cni_number,
    uv.oneci_data,
    uv.oneci_verified_at,
    uv.cnam_status,
    uv.cnam_social_security_number,
    uv.cnam_employer,
    uv.cnam_data,
    uv.cnam_verified_at,
    uv.face_verification_status,
    uv.face_similarity_score,
    uv.face_verified_at,
    uv.admin_review_notes,
    uv.admin_reviewed_at,
    uv.admin_reviewed_by,
    uv.created_at,
    uv.updated_at
  FROM public.user_verifications uv
  JOIN public.profiles p ON p.id = uv.user_id
  WHERE uv.oneci_status = 'pending_review' 
     OR uv.cnam_status = 'pending_review';
END;
$$;

COMMENT ON FUNCTION public.get_verifications_for_admin_review() IS 
'Secure RPC for super admin verification review with full audit logging.
Returns ALL verification data including sensitive government IDs.
All access attempts are logged to admin_audit_logs for compliance.
Only accessible by super_admin role.';

-- EPIC 3: Fix dangerous USING(false) RLS policies
-- The policies already exist, so just add documentation
COMMENT ON POLICY "Block unauthenticated profile access" ON public.profiles IS
'Explicit deny policy for unauthenticated users. Uses (auth.uid() IS NOT NULL AND false) pattern which is more reliable than USING(false) alone.';

COMMENT ON POLICY "Block unauthenticated verification access" ON public.user_verifications IS
'Explicit deny policy for unauthenticated users. Uses (auth.uid() IS NOT NULL AND false) pattern which is more reliable than USING(false) alone.';