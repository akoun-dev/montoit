-- CRITICAL SECURITY FIX: Prevent trusted third parties from accessing sensitive ID data
-- Drop the dangerous policy that exposes CNI numbers, social security numbers, and biometric data

DROP POLICY IF EXISTS "Trusted third parties can view pending verifications" ON public.user_verifications;

-- Create secure RPC function for trusted third parties to review verifications
-- This function ONLY returns verification status, NEVER the actual ID numbers or biometric data
CREATE OR REPLACE FUNCTION public.get_verifications_for_review()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  user_type user_type,
  city text,
  oneci_status text,
  cnam_status text,
  oneci_verified_at timestamp with time zone,
  cnam_verified_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is a trusted third party
  IF NOT public.is_trusted_third_party(auth.uid()) THEN
    RAISE EXCEPTION 'Only active trusted third parties can access verification queue';
  END IF;
  
  -- Log the access attempt
  INSERT INTO public.admin_audit_logs (
    admin_id,
    action_type,
    target_type,
    target_id,
    notes
  ) VALUES (
    auth.uid(),
    'verification_queue_accessed',
    'user_verification',
    auth.uid(),
    'Trusted third party accessed verification review queue'
  );
  
  -- Return ONLY non-sensitive verification data
  -- Explicitly excluded: oneci_cni_number, cnam_social_security_number, 
  --                     oneci_data, cnam_data, face_similarity_score
  RETURN QUERY
  SELECT 
    uv.user_id,
    p.full_name,
    p.user_type,
    p.city,
    uv.oneci_status,
    uv.cnam_status,
    uv.oneci_verified_at,
    uv.cnam_verified_at,
    uv.created_at,
    uv.updated_at
  FROM public.user_verifications uv
  JOIN public.profiles p ON p.id = uv.user_id
  WHERE uv.oneci_status = 'pending_review' 
     OR uv.cnam_status = 'pending_review';
END;
$$;

-- Add comment explaining the security architecture
COMMENT ON FUNCTION public.get_verifications_for_review() IS 
'Secure RPC for trusted third parties to access verification queue.
ONLY returns verification status and non-sensitive user info.
NEVER returns: CNI numbers, social security numbers, biometric scores, or verification data.
All access attempts are logged to admin_audit_logs for auditing.';

COMMENT ON TABLE public.user_verifications IS 
'Stores sensitive identity verification data including government IDs and biometric scores.
Access is STRICTLY restricted:
- Users can view their own verification data
- Super admins can view all verification data via view_user_verification() RPC
- Trusted third parties MUST use get_verifications_for_review() RPC (status only, no sensitive data)
Direct SELECT is blocked by RLS for cross-user access.';