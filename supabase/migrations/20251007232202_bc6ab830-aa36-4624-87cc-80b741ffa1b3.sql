-- Drop et recréer la fonction get_my_verification_status
DROP FUNCTION IF EXISTS public.get_my_verification_status();

CREATE OR REPLACE FUNCTION public.get_my_verification_status()
RETURNS TABLE(
  oneci_verified BOOLEAN,
  cnam_verified BOOLEAN,
  face_verified BOOLEAN,
  passport_verified BOOLEAN,
  oneci_status TEXT,
  cnam_status TEXT,
  face_verification_status TEXT,
  passport_status TEXT,
  tenant_score INTEGER,
  admin_review_notes TEXT,
  admin_reviewed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the access attempt
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

  -- Return status fields including passport
  RETURN QUERY
  SELECT 
    p.oneci_verified,
    p.cnam_verified,
    p.face_verified,
    p.passport_verified,
    uv.oneci_status,
    uv.cnam_status,
    uv.face_verification_status,
    uv.passport_status,
    uv.tenant_score,
    uv.admin_review_notes,
    uv.admin_reviewed_at
  FROM public.user_verifications uv
  JOIN public.profiles p ON p.id = uv.user_id
  WHERE uv.user_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
END;
$$;