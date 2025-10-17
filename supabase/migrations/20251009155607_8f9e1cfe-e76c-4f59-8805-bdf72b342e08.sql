-- Ajouter colonnes pour état des travaux et titre de propriété
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS work_status TEXT DEFAULT 'aucun_travail' 
  CHECK (work_status IN ('aucun_travail', 'travaux_a_effectuer')),
ADD COLUMN IF NOT EXISTS work_description TEXT,
ADD COLUMN IF NOT EXISTS work_images JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS title_deed_url TEXT;

-- Créer une vue pour les biens publics qui masque le titre de propriété
CREATE OR REPLACE FUNCTION get_property_with_title_deed(p_property_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  property_type TEXT,
  city TEXT,
  neighborhood TEXT,
  address TEXT,
  monthly_rent NUMERIC,
  deposit_amount NUMERIC,
  charges_amount NUMERIC,
  surface_area NUMERIC,
  bedrooms INTEGER,
  bathrooms INTEGER,
  floor_number INTEGER,
  is_furnished BOOLEAN,
  has_parking BOOLEAN,
  has_garden BOOLEAN,
  has_ac BOOLEAN,
  status TEXT,
  moderation_status TEXT,
  images TEXT[],
  main_image TEXT,
  video_url TEXT,
  virtual_tour_url TEXT,
  panoramic_images JSONB,
  floor_plans JSONB,
  media_metadata JSONB,
  latitude NUMERIC,
  longitude NUMERIC,
  view_count INTEGER,
  work_status TEXT,
  work_description TEXT,
  work_images JSONB,
  title_deed_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_can_access_title BOOLEAN := FALSE;
BEGIN
  -- Vérifier si l'utilisateur peut voir le titre de propriété
  -- Cas 1: L'utilisateur est le propriétaire
  IF EXISTS (
    SELECT 1 FROM properties p 
    WHERE p.id = p_property_id AND p.owner_id = auth.uid()
  ) THEN
    v_can_access_title := TRUE;
  -- Cas 2: L'utilisateur est locataire actif du bien
  ELSIF EXISTS (
    SELECT 1 FROM leases l
    WHERE l.property_id = p_property_id 
      AND l.tenant_id = auth.uid()
      AND l.status = 'active'
  ) THEN
    v_can_access_title := TRUE;
  -- Cas 3: L'utilisateur est admin
  ELSIF has_role(auth.uid(), 'admin'::app_role) THEN
    v_can_access_title := TRUE;
  END IF;

  -- Retourner la propriété avec ou sans titre selon les droits
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
    p.work_status,
    p.work_description,
    p.work_images,
    CASE WHEN v_can_access_title THEN p.title_deed_url ELSE NULL END as title_deed_url,
    p.created_at,
    p.updated_at
  FROM properties p
  WHERE p.id = p_property_id;
END;
$$;

COMMENT ON FUNCTION get_property_with_title_deed IS 'Retourne une propriété avec accès conditionnel au titre de propriété selon les droits de l''utilisateur';

-- Logger l'accès aux titres de propriété
CREATE OR REPLACE FUNCTION log_title_deed_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Logger uniquement si title_deed_url est accédé et non-null
  IF NEW.title_deed_url IS NOT NULL THEN
    INSERT INTO admin_audit_logs (
      admin_id,
      action_type,
      target_type,
      target_id,
      notes
    ) VALUES (
      auth.uid(),
      'title_deed_accessed',
      'property',
      NEW.id,
      'Accès au titre de propriété'
    );
  END IF;
  RETURN NEW;
END;
$$;