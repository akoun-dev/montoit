-- ============================================
-- SECURITY FIX: Hide Property Owner IDs from Public Access
-- ============================================
-- Issue: Properties table exposes owner_id in public queries,
-- allowing malicious actors to map properties to users for targeting.
--
-- Solution:
--   1. Create secure RPC for public property browsing (no owner_id)
--   2. Restrict direct SELECT to owners and admins only
--   3. Log access to maintain audit trail
-- ============================================

-- Step 1: Create secure RPC for public property viewing
CREATE OR REPLACE FUNCTION public.get_public_properties(
  p_city text DEFAULT NULL,
  p_property_type text DEFAULT NULL,
  p_min_rent numeric DEFAULT NULL,
  p_max_rent numeric DEFAULT NULL,
  p_min_bedrooms integer DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  property_type text,
  city text,
  neighborhood text,
  address text,
  monthly_rent numeric,
  deposit_amount numeric,
  charges_amount numeric,
  surface_area numeric,
  bedrooms integer,
  bathrooms integer,
  floor_number integer,
  is_furnished boolean,
  has_parking boolean,
  has_garden boolean,
  has_ac boolean,
  status text,
  moderation_status text,
  images text[],
  main_image text,
  video_url text,
  virtual_tour_url text,
  panoramic_images jsonb,
  floor_plans jsonb,
  media_metadata jsonb,
  latitude numeric,
  longitude numeric,
  view_count integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return approved properties WITHOUT owner_id field
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.description,
    p.property_type,
    p.city,
    p.neighborhood,
    p.address,
    p.monthly_rent,
    p.deposit_amount,
    p.charges_amount,
    p.surface_area,
    p.bedrooms,
    p.bathrooms,
    p.floor_number,
    p.is_furnished,
    p.has_parking,
    p.has_garden,
    p.has_ac,
    p.status,
    p.moderation_status,
    p.images,
    p.main_image,
    p.video_url,
    p.virtual_tour_url,
    p.panoramic_images,
    p.floor_plans,
    p.media_metadata,
    p.latitude,
    p.longitude,
    p.view_count,
    p.created_at,
    p.updated_at
  FROM public.properties p
  WHERE p.moderation_status = 'approved'
    AND (p_city IS NULL OR p.city = p_city)
    AND (p_property_type IS NULL OR p.property_type = p_property_type)
    AND (p_min_rent IS NULL OR p.monthly_rent >= p_min_rent)
    AND (p_max_rent IS NULL OR p.monthly_rent <= p_max_rent)
    AND (p_min_bedrooms IS NULL OR p.bedrooms >= p_min_bedrooms)
    AND (p_status IS NULL OR p.status = p_status)
  ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute to all users (including anonymous)
GRANT EXECUTE ON FUNCTION public.get_public_properties TO anon, authenticated;

-- Step 2: Create RPC to get single property details (public - no owner_id)
CREATE OR REPLACE FUNCTION public.get_public_property(p_property_id uuid)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  property_type text,
  city text,
  neighborhood text,
  address text,
  monthly_rent numeric,
  deposit_amount numeric,
  charges_amount numeric,
  surface_area numeric,
  bedrooms integer,
  bathrooms integer,
  floor_number integer,
  is_furnished boolean,
  has_parking boolean,
  has_garden boolean,
  has_ac boolean,
  status text,
  moderation_status text,
  images text[],
  main_image text,
  video_url text,
  virtual_tour_url text,
  panoramic_images jsonb,
  floor_plans jsonb,
  media_metadata jsonb,
  latitude numeric,
  longitude numeric,
  view_count integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.description,
    p.property_type,
    p.city,
    p.neighborhood,
    p.address,
    p.monthly_rent,
    p.deposit_amount,
    p.charges_amount,
    p.surface_area,
    p.bedrooms,
    p.bathrooms,
    p.floor_number,
    p.is_furnished,
    p.has_parking,
    p.has_garden,
    p.has_ac,
    p.status,
    p.moderation_status,
    p.images,
    p.main_image,
    p.video_url,
    p.virtual_tour_url,
    p.panoramic_images,
    p.floor_plans,
    p.media_metadata,
    p.latitude,
    p.longitude,
    p.view_count,
    p.created_at,
    p.updated_at
  FROM public.properties p
  WHERE p.id = p_property_id
    AND p.moderation_status = 'approved';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_property TO anon, authenticated;

-- Step 3: Tighten RLS policies
-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Propriétés approuvées publiquement visibles" ON public.properties;

-- Create restrictive policies
CREATE POLICY "Owners can view their own properties"
ON public.properties
FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Admins can view all properties"
ON public.properties
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Step 4: Add table documentation
COMMENT ON TABLE public.properties IS 
'SECURITY: owner_id is sensitive and not exposed in public queries.
Access patterns:
- Public browsing: use get_public_properties() or get_public_property() RPCs
- Property owners: direct SELECT with RLS (full access to own properties)
- Admins: direct SELECT with RLS (full access to all properties)
- Applications/Messages: use owner_id internally for authorized communications';

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
  'properties',
  gen_random_uuid(),
  'SECURITY FIX: Restricted public access to properties table. Created get_public_properties() and get_public_property() RPCs that hide owner_id to prevent user targeting.',
  jsonb_build_object(
    'changes', jsonb_build_array(
      'Removed public SELECT policy exposing owner_id',
      'Created get_public_properties() RPC for safe public browsing',
      'Created get_public_property() RPC for safe single property viewing',
      'Restricted direct SELECT to owners and admins only'
    ),
    'exposed_properties_count', (SELECT COUNT(*) FROM public.properties WHERE moderation_status = 'approved'),
    'timestamp', now()
  )
);