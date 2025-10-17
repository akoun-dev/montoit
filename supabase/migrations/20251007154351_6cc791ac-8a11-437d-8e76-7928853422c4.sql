-- ============================================
-- SECURITY FIX: Protect Government ID Numbers and Biometric Data
-- ============================================
-- Issue: user_verifications table contains highly sensitive PII:
--   - CNAM social security numbers
--   - ONECI CNI numbers
--   - Face verification scores
--   - Raw government verification data in JSONB
--
-- Solution: 
--   1. Tighten RLS policies to block all direct user access
--   2. Create secure RPC for users to view STATUS only (no raw IDs)
--   3. Ensure only authorized processes can access sensitive fields
--   4. Log all access attempts
-- ============================================

-- Step 1: Drop overly permissive policies
DROP POLICY IF EXISTS "System can manage verifications" ON public.user_verifications;
DROP POLICY IF EXISTS "Users can view their own verifications" ON public.user_verifications;

-- Step 2: Create restrictive policies

-- Block ALL direct user access (already exists but we're making it explicit)
CREATE POLICY "Block all direct user SELECT access"
ON public.user_verifications
FOR SELECT
TO authenticated
USING (false);

-- Only allow INSERT/UPDATE from service role or edge functions (not regular users)
CREATE POLICY "Only system can insert verifications"
ON public.user_verifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only edge functions running as service role can insert
  auth.jwt()->>'role' = 'service_role'
);

CREATE POLICY "Only system can update verifications"
ON public.user_verifications
FOR UPDATE
TO authenticated
USING (
  -- Only edge functions running as service role OR super admins can update
  auth.jwt()->>'role' = 'service_role' 
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- Step 3: Create secure RPC for users to view their verification STATUS
-- (without exposing sensitive government ID numbers)
CREATE OR REPLACE FUNCTION public.get_my_verification_status()
RETURNS TABLE(
  oneci_verified boolean,
  cnam_verified boolean,
  face_verified boolean,
  oneci_status text,
  cnam_status text,
  face_verification_status text,
  tenant_score integer,
  admin_review_notes text,
  admin_reviewed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the access attempt to centralized sensitive data log
  INSERT INTO public.sensitive_data_access_log (
    requester_id,
    target_user_id,
    data_type,
    access_granted,
    relationship_type,
    metadata
  ) VALUES (
    auth.uid(),
    auth.uid(),
    'verification_status',
    true,
    'self',
    jsonb_build_object(
      'action', 'view_own_status',
      'timestamp', now()
    )
  );

  -- Return ONLY status fields, NOT sensitive government IDs
  RETURN QUERY
  SELECT 
    p.oneci_verified,
    p.cnam_verified,
    p.face_verified,
    uv.oneci_status,
    uv.cnam_status,
    uv.face_verification_status,
    uv.tenant_score,
    uv.admin_review_notes,
    uv.admin_reviewed_at
  FROM public.user_verifications uv
  JOIN public.profiles p ON p.id = uv.user_id
  WHERE uv.user_id = auth.uid();
  
  -- If no record found, return empty result (not an error)
  IF NOT FOUND THEN
    RETURN;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_verification_status() TO authenticated;

-- Step 4: Add comment documentation
COMMENT ON TABLE public.user_verifications IS 
'SECURITY: Contains highly sensitive government ID data. Direct SELECT is blocked. 
Access patterns:
- Users: use get_my_verification_status() for status only
- Admins: use get_verifications_for_admin_review() (logged)
- Trusted 3rd parties: use get_verifications_for_review() (no sensitive data)
- Edge functions: use service role for verification processes';

-- Step 5: Log this security fix
INSERT INTO public.admin_audit_logs (
  admin_id,
  action_type,
  target_type,
  target_id,
  notes,
  action_metadata
) VALUES (
  NULL,
  'security_policy_updated',
  'user_verifications',
  gen_random_uuid(),
  'SECURITY FIX: Tightened RLS policies on user_verifications to protect government IDs. Created get_my_verification_status() RPC for safe user access to status only.',
  jsonb_build_object(
    'changes', jsonb_build_array(
      'Blocked all direct SELECT access',
      'Restricted INSERT/UPDATE to service role only',
      'Created get_my_verification_status() RPC',
      'Added centralized access logging'
    ),
    'timestamp', now()
  )
);