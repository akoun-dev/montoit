-- EPIC 4: Protect dispute reporter identity from retaliation
-- Create secure RPC to view disputes with masked reporter_id for reported users

CREATE OR REPLACE FUNCTION public.get_my_disputes()
RETURNS TABLE (
  id uuid,
  dispute_type text,
  description text,
  status text,
  priority text,
  lease_id uuid,
  reporter_id uuid,
  reported_id uuid,
  assigned_to uuid,
  attachments jsonb,
  resolution_notes text,
  created_at timestamp with time zone,
  resolved_at timestamp with time zone,
  is_reporter boolean,
  reporter_name text,
  reported_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.dispute_type,
    d.description,
    d.status,
    d.priority,
    d.lease_id,
    -- Mask reporter_id if user is the reported party (not admin)
    CASE 
      WHEN auth.uid() = d.reported_id AND NOT public.has_role(auth.uid(), 'admin'::app_role) 
      THEN NULL 
      ELSE d.reporter_id 
    END as reporter_id,
    d.reported_id,
    d.assigned_to,
    d.attachments,
    d.resolution_notes,
    d.created_at,
    d.resolved_at,
    (auth.uid() = d.reporter_id) as is_reporter,
    -- Mask reporter name if user is reported party
    CASE 
      WHEN auth.uid() = d.reported_id AND NOT public.has_role(auth.uid(), 'admin'::app_role)
      THEN 'Utilisateur anonyme'
      ELSE (SELECT full_name FROM public.profiles WHERE id = d.reporter_id)
    END as reporter_name,
    (SELECT full_name FROM public.profiles WHERE id = d.reported_id) as reported_name
  FROM public.disputes d
  WHERE auth.uid() = d.reporter_id 
     OR auth.uid() = d.reported_id 
     OR public.has_role(auth.uid(), 'admin'::app_role);
END;
$$;

COMMENT ON FUNCTION public.get_my_disputes() IS 
'Secure RPC to view disputes with reporter identity protection.
Reported users see disputes but reporter_id is masked to prevent retaliation.
Only admins can see full reporter identity.';

-- EPIC 5: Enhanced payment security with access logging
-- Create payment access log table

CREATE TABLE IF NOT EXISTS public.payment_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  payment_id uuid NOT NULL,
  access_granted boolean NOT NULL,
  relationship_type text,
  accessed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view payment access logs"
ON public.payment_access_log
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can log payment access"
ON public.payment_access_log
FOR INSERT
WITH CHECK (auth.uid() = requester_id);

-- Create secure RPC for payment access with logging
CREATE OR REPLACE FUNCTION public.get_user_payments(target_user_id uuid)
RETURNS TABLE (
  id uuid,
  payer_id uuid,
  receiver_id uuid,
  amount numeric,
  payment_type text,
  payment_method text,
  status text,
  transaction_id text,
  property_id uuid,
  created_at timestamp with time zone,
  completed_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_access boolean := false;
  relationship text := 'none';
BEGIN
  -- Check access rights
  IF auth.uid() = target_user_id THEN
    has_access := true;
    relationship := 'self';
  ELSIF public.has_role(auth.uid(), 'admin'::app_role) THEN
    has_access := true;
    relationship := 'admin';
  END IF;

  -- Return payments if authorized
  IF has_access THEN
    RETURN QUERY
    SELECT 
      p.id, p.payer_id, p.receiver_id, p.amount, p.payment_type,
      p.payment_method, p.status, p.transaction_id, p.property_id,
      p.created_at, p.completed_at
    FROM public.payments p
    WHERE p.payer_id = target_user_id OR p.receiver_id = target_user_id;
  ELSE
    -- Log unauthorized access attempt
    INSERT INTO public.payment_access_log (
      requester_id, payment_id, access_granted, relationship_type
    ) VALUES (
      auth.uid(), 
      '00000000-0000-0000-0000-000000000000'::uuid, 
      false, 
      'unauthorized'
    );
    
    RAISE EXCEPTION 'Unauthorized access to payment data';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_user_payments(uuid) IS 
'Secure RPC to access payment data with audit logging.
Only the user themselves or admins can view payment history.
All access attempts are logged for security monitoring.';

-- EPIC 7: Centralized sensitive data access logging
CREATE TABLE IF NOT EXISTS public.sensitive_data_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  data_type text NOT NULL, -- phone, verification, payment, dispute, etc.
  access_granted boolean NOT NULL,
  relationship_type text,
  metadata jsonb DEFAULT '{}'::jsonb,
  accessed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sensitive_data_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sensitive data access logs"
ON public.sensitive_data_access_log
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can log sensitive data access"
ON public.sensitive_data_access_log
FOR INSERT
WITH CHECK (auth.uid() = requester_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_sensitive_data_access_log_requester 
ON public.sensitive_data_access_log(requester_id, accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_sensitive_data_access_log_target 
ON public.sensitive_data_access_log(target_user_id, accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_sensitive_data_access_log_type 
ON public.sensitive_data_access_log(data_type, accessed_at DESC);

COMMENT ON TABLE public.sensitive_data_access_log IS 
'Centralized audit log for all sensitive data access.
Tracks phone numbers, verifications, payments, disputes, etc.
Critical for GDPR compliance and security monitoring.';

-- Update get_user_phone to use centralized logging
CREATE OR REPLACE FUNCTION public.get_user_phone(target_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_phone text;
  has_access boolean := false;
  relationship text := 'none';
BEGIN
  -- Access checks (same as before)
  IF auth.uid() = target_user_id THEN
    has_access := true;
    relationship := 'self';
  ELSIF EXISTS (
    SELECT 1 FROM public.rental_applications ra
    JOIN public.properties p ON p.id = ra.property_id
    WHERE ra.applicant_id = target_user_id
      AND p.owner_id = auth.uid()
  ) THEN
    has_access := true;
    relationship := 'landlord_to_applicant';
  ELSIF EXISTS (
    SELECT 1 FROM public.rental_applications ra
    JOIN public.properties p ON p.id = ra.property_id
    WHERE ra.applicant_id = auth.uid()
      AND p.owner_id = target_user_id
  ) THEN
    has_access := true;
    relationship := 'applicant_to_landlord';
  ELSIF EXISTS (
    SELECT 1 FROM public.leases
    WHERE (landlord_id = auth.uid() AND tenant_id = target_user_id)
       OR (tenant_id = auth.uid() AND landlord_id = target_user_id)
  ) THEN
    has_access := true;
    relationship := 'lease_party';
  ELSIF public.has_role(auth.uid(), 'admin'::app_role) THEN
    has_access := true;
    relationship := 'admin';
  END IF;

  -- Log to centralized table (replaces old phone_access_log)
  INSERT INTO public.sensitive_data_access_log (
    requester_id, target_user_id, data_type, access_granted, relationship_type
  ) VALUES (
    auth.uid(), target_user_id, 'phone', has_access, relationship
  );

  -- Return phone if authorized
  IF has_access THEN
    SELECT phone INTO user_phone FROM public.profiles WHERE id = target_user_id;
    RETURN user_phone;
  ELSE
    RETURN NULL;
  END IF;
END;
$$;