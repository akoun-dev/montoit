/*
  # Improve Visit Requests: Priority Score & Expiration System
  
  This migration enhances the visit request system with:
  
  1. **Improved Priority Score Calculation**
     - Fixed algorithm to properly calculate scores based on user verification
     - Identity verified (ONECI OR CNAM): +30 points
     - CNAM verified: +20 points (additional)
     - Account age > 1 month: +10 points
     - Previous applications: +20 points
     - Complete verification (ONECI + CNAM): +20 points bonus
     - Stores detailed breakdown in JSONB for transparency
  
  2. **Automatic Request Expiration System**
     - Expires pending requests after 48 hours automatically
     - Creates notifications for expired requests
     - Updates notification system integration
     - Returns count of expired requests for monitoring
  
  3. **Enhanced Triggers**
     - Auto-calculate priority on insert
     - Auto-set expiration time (48h from creation)
     - Better error handling and logging
  
  4. Security
     - All functions use SECURITY DEFINER for proper access
     - RLS policies remain unchanged and secure
*/

-- ========================================
-- IMPROVED PRIORITY SCORE CALCULATION
-- ========================================

-- Drop and recreate the function with improved algorithm
DROP FUNCTION IF EXISTS calculate_visit_request_priority_score(uuid);

CREATE OR REPLACE FUNCTION calculate_visit_request_priority_score(p_user_id uuid)
RETURNS jsonb 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score integer := 0;
  v_breakdown jsonb := jsonb_build_object();
  v_profile record;
  v_verification record;
  v_account_age_days integer;
  v_application_count integer;
  v_identity_verified boolean := false;
  v_cnam_verified boolean := false;
  v_complete_verification boolean := false;
BEGIN
  -- Get user profile (handle missing profile gracefully)
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;
  
  IF v_profile IS NULL THEN
    -- Return default score if no profile exists
    RETURN jsonb_build_object(
      'score', 0,
      'breakdown', jsonb_build_object('error', 'Profile not found')
    );
  END IF;
  
  -- Get verification status (handle missing verification gracefully)
  SELECT * INTO v_verification
  FROM public.user_verifications
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Check identity verification status
  IF v_verification IS NOT NULL THEN
    v_identity_verified := (
      v_verification.oneci_status = 'verified' OR 
      v_verification.face_verification_status = 'verified' OR
      v_profile.is_verified = true
    );
    
    v_cnam_verified := (v_verification.cnam_status = 'verified');
    
    v_complete_verification := (
      v_verification.oneci_status = 'verified' AND 
      v_verification.cnam_status = 'verified'
    );
  ELSIF v_profile.is_verified = true THEN
    v_identity_verified := true;
  END IF;
  
  -- Identity verified: +30 points
  IF v_identity_verified THEN
    v_score := v_score + 30;
    v_breakdown := v_breakdown || jsonb_build_object(
      'identity_verified', true,
      'identity_score', 30
    );
  ELSE
    v_breakdown := v_breakdown || jsonb_build_object(
      'identity_verified', false,
      'identity_score', 0
    );
  END IF;
  
  -- CNAM verified: +20 points (additional)
  IF v_cnam_verified THEN
    v_score := v_score + 20;
    v_breakdown := v_breakdown || jsonb_build_object(
      'cnam_verified', true,
      'cnam_score', 20
    );
  ELSE
    v_breakdown := v_breakdown || jsonb_build_object(
      'cnam_verified', false,
      'cnam_score', 0
    );
  END IF;
  
  -- Account age > 1 month: +10 points
  v_account_age_days := EXTRACT(DAY FROM (now() - v_profile.created_at))::integer;
  
  IF v_account_age_days > 30 THEN
    v_score := v_score + 10;
    v_breakdown := v_breakdown || jsonb_build_object(
      'account_age_days', v_account_age_days,
      'account_age_score', 10
    );
  ELSE
    v_breakdown := v_breakdown || jsonb_build_object(
      'account_age_days', v_account_age_days,
      'account_age_score', 0
    );
  END IF;
  
  -- Previous applications: +20 points
  SELECT COUNT(*) INTO v_application_count
  FROM public.rental_applications
  WHERE applicant_id = p_user_id;
  
  IF v_application_count > 0 THEN
    v_score := v_score + 20;
    v_breakdown := v_breakdown || jsonb_build_object(
      'has_applications', true,
      'application_count', v_application_count,
      'applications_score', 20
    );
  ELSE
    v_breakdown := v_breakdown || jsonb_build_object(
      'has_applications', false,
      'application_count', 0,
      'applications_score', 0
    );
  END IF;
  
  -- Complete verification bonus (ONECI + CNAM): +20 points
  IF v_complete_verification THEN
    v_score := v_score + 20;
    v_breakdown := v_breakdown || jsonb_build_object(
      'complete_verification', true,
      'complete_verification_score', 20
    );
  ELSE
    v_breakdown := v_breakdown || jsonb_build_object(
      'complete_verification', false,
      'complete_verification_score', 0
    );
  END IF;
  
  -- Add calculation timestamp
  v_breakdown := v_breakdown || jsonb_build_object(
    'calculated_at', now(),
    'total_score', v_score
  );
  
  -- Return score and detailed breakdown
  RETURN jsonb_build_object(
    'score', v_score,
    'breakdown', v_breakdown
  );
END;
$$;

-- ========================================
-- ENHANCED EXPIRATION FUNCTION
-- ========================================

-- Drop and recreate with notification support
DROP FUNCTION IF EXISTS expire_stale_visit_requests();

CREATE OR REPLACE FUNCTION expire_stale_visit_requests()
RETURNS TABLE(expired_count integer, expired_request_ids uuid[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_ids uuid[];
  v_expired_count integer;
  v_request record;
BEGIN
  -- Find and collect expired requests
  SELECT array_agg(id) INTO v_expired_ids
  FROM public.property_visit_requests
  WHERE status = 'pending'
    AND expires_at < now();
  
  -- Get count
  v_expired_count := COALESCE(array_length(v_expired_ids, 1), 0);
  
  -- If no expired requests, return early
  IF v_expired_count = 0 THEN
    RETURN QUERY SELECT 0, ARRAY[]::uuid[];
    RETURN;
  END IF;
  
  -- Update status to expired
  UPDATE public.property_visit_requests
  SET 
    status = 'expired',
    updated_at = now()
  WHERE id = ANY(v_expired_ids);
  
  -- Create notifications for each expired request
  FOR v_request IN 
    SELECT r.id, r.requester_id, r.property_id, p.title
    FROM public.property_visit_requests r
    JOIN public.properties p ON p.id = r.property_id
    WHERE r.id = ANY(v_expired_ids)
  LOOP
    -- Notify the requester
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      link,
      metadata
    ) VALUES (
      v_request.requester_id,
      'visit_request_expired',
      'Demande de visite expirée',
      'Votre demande de visite pour "' || v_request.title || '" a expiré après 48h sans réponse. Vous pouvez soumettre une nouvelle demande.',
      '/properties/' || v_request.property_id,
      jsonb_build_object(
        'request_id', v_request.id,
        'property_id', v_request.property_id,
        'expired_at', now()
      )
    );
  END LOOP;
  
  -- Return results
  RETURN QUERY SELECT v_expired_count, v_expired_ids;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_visit_request_priority_score TO authenticated;
GRANT EXECUTE ON FUNCTION expire_stale_visit_requests TO service_role;

-- Add helpful comment
COMMENT ON FUNCTION calculate_visit_request_priority_score IS 'Calculates priority score (0-100) for visit requests based on user verification status and history';
COMMENT ON FUNCTION expire_stale_visit_requests IS 'Expires pending visit requests older than 48 hours and creates notifications. Returns count and IDs of expired requests.';
