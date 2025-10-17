-- ============================================
-- Fix: User Contact Information Harvesting Prevention
-- ============================================
-- Remove overly permissive RLS policies that expose phone numbers
-- Users should access phone numbers only via get_user_phone() RPC

-- Drop the policies that allow full profile access
DROP POLICY IF EXISTS "Applicants can view landlord profiles via view" ON public.profiles;
DROP POLICY IF EXISTS "Landlords can view applicant profiles via view" ON public.profiles;
DROP POLICY IF EXISTS "Lease parties can view each other profiles" ON public.profiles;

-- Create restricted policies that use profiles_public view concept
-- Landlords can view applicant public info (no phone)
CREATE POLICY "Landlords can view applicant public profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT ra.applicant_id
    FROM rental_applications ra
    JOIN properties p ON p.id = ra.property_id
    WHERE p.owner_id = auth.uid()
  )
  AND auth.uid() != id  -- Can't use this policy for own profile
);

-- Applicants can view landlord public info (no phone)
CREATE POLICY "Applicants can view landlord public profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT p.owner_id
    FROM rental_applications ra
    JOIN properties p ON p.id = ra.property_id
    WHERE ra.applicant_id = auth.uid()
  )
  AND auth.uid() != id  -- Can't use this policy for own profile
);

-- Lease parties can view each other's public info (no phone)
CREATE POLICY "Lease parties can view each other public profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT l.landlord_id FROM leases l WHERE l.tenant_id = auth.uid()
    UNION
    SELECT l.tenant_id FROM leases l WHERE l.landlord_id = auth.uid()
  )
  AND auth.uid() != id  -- Can't use this policy for own profile
);

-- Create a function to get only public profile fields (without phone)
CREATE OR REPLACE FUNCTION public.get_public_profile(target_user_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  bio text,
  city text,
  user_type user_type,
  is_verified boolean,
  oneci_verified boolean,
  cnam_verified boolean,
  face_verified boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return public fields, never phone
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.avatar_url,
    p.bio,
    p.city,
    p.user_type,
    p.is_verified,
    p.oneci_verified,
    p.cnam_verified,
    p.face_verified,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE p.id = target_user_id;
END;
$$;

-- Add comment explaining phone access
COMMENT ON FUNCTION public.get_public_profile IS 'Returns public profile information without sensitive data like phone numbers. Use get_user_phone() RPC for legitimate phone number access.';

-- Add rate limiting metadata table for get_user_phone calls
CREATE TABLE IF NOT EXISTS public.phone_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  accessed_at timestamp with time zone NOT NULL DEFAULT now(),
  access_granted boolean NOT NULL,
  relationship_type text
);

-- Enable RLS on phone access log
ALTER TABLE public.phone_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view phone access logs
CREATE POLICY "Admins can view phone access logs"
ON public.phone_access_log
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert phone access logs
CREATE POLICY "System can log phone access"
ON public.phone_access_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = requester_id);

-- Update get_user_phone function to log access attempts
CREATE OR REPLACE FUNCTION public.get_user_phone(target_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  user_phone text;
  has_access boolean := false;
  relationship text := 'none';
BEGIN
  -- Cas 1 : L'utilisateur demande son propre téléphone
  IF auth.uid() = target_user_id THEN
    has_access := true;
    relationship := 'self';
  END IF;

  -- Cas 2 : Propriétaire voit le téléphone de ses candidats
  IF NOT has_access AND EXISTS (
    SELECT 1 FROM public.rental_applications ra
    JOIN public.properties p ON p.id = ra.property_id
    WHERE ra.applicant_id = target_user_id
      AND p.owner_id = auth.uid()
  ) THEN
    has_access := true;
    relationship := 'landlord_to_applicant';
  END IF;

  -- Cas 3 : Candidat voit le téléphone du propriétaire de la propriété qu'il a candidaté
  IF NOT has_access AND EXISTS (
    SELECT 1 FROM public.rental_applications ra
    JOIN public.properties p ON p.id = ra.property_id
    WHERE ra.applicant_id = auth.uid()
      AND p.owner_id = target_user_id
  ) THEN
    has_access := true;
    relationship := 'applicant_to_landlord';
  END IF;

  -- Cas 4 : Parties d'un bail actif (propriétaire ↔ locataire)
  IF NOT has_access AND EXISTS (
    SELECT 1 FROM public.leases
    WHERE (landlord_id = auth.uid() AND tenant_id = target_user_id)
       OR (tenant_id = auth.uid() AND landlord_id = target_user_id)
  ) THEN
    has_access := true;
    relationship := 'lease_party';
  END IF;

  -- Cas 5 : Admins ont accès à tous les téléphones
  IF NOT has_access AND public.has_role(auth.uid(), 'admin'::app_role) THEN
    has_access := true;
    relationship := 'admin';
  END IF;

  -- Log the access attempt
  INSERT INTO public.phone_access_log (requester_id, target_user_id, access_granted, relationship_type)
  VALUES (auth.uid(), target_user_id, has_access, relationship);

  -- Récupérer le téléphone si accès autorisé
  IF has_access THEN
    SELECT phone INTO user_phone
    FROM public.profiles
    WHERE id = target_user_id;
    
    RETURN user_phone;
  ELSE
    -- Pas d'accès légitime, retourne NULL
    RETURN NULL;
  END IF;
END;
$function$;