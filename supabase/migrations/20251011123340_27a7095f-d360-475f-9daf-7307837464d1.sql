-- Phase 1.1: Mise à jour de get_public_properties() pour exclure les biens loués
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
  created_at timestamp with time zone,
  updated_at timestamp with time zone
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
  WHERE p.moderation_status = 'approved'
    AND p.status IN ('disponible', 'en_negociation')  -- Masquer automatiquement les biens loués
    AND (p_city IS NULL OR p.city = p_city)
    AND (p_property_type IS NULL OR p.property_type = p_property_type)
    AND (p_min_rent IS NULL OR p.monthly_rent >= p_min_rent)
    AND (p_max_rent IS NULL OR p.monthly_rent <= p_max_rent)
    AND (p_min_bedrooms IS NULL OR p.bedrooms >= p_min_bedrooms)
    AND (p_status IS NULL OR p.status = p_status)
  ORDER BY p.created_at DESC;
END;
$$;

-- Phase 1.2: Mise à jour de get_public_property() pour exclure les biens loués
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
  created_at timestamp with time zone,
  updated_at timestamp with time zone
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
    AND p.moderation_status = 'approved'
    AND p.status IN ('disponible', 'en_negociation');  -- Masquer automatiquement les biens loués
END;
$$;