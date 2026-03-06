-- Migration: Create properties table
-- Description: Property listings
-- Order: Fourth table (references profiles, agencies)

CREATE TABLE IF NOT EXISTS public.properties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  property_type property_type_enum NOT NULL,
  status property_status DEFAULT 'available'::property_status,
  address jsonb NOT NULL DEFAULT '{}'::jsonb,
  coordinates jsonb DEFAULT '{}'::jsonb,
  latitude numeric,
  longitude numeric,
  city text,
  neighborhood text,
  surface_area numeric,
  rooms integer DEFAULT 1,
  bedrooms integer,
  bathrooms integer,
  floor_number integer,
  furnished boolean DEFAULT false,
  has_parking boolean DEFAULT false,
  has_garden boolean DEFAULT false,
  has_ac boolean DEFAULT false,
  has_elevator boolean DEFAULT false,
  year_built integer,
  price numeric NOT NULL,
  deposit_amount numeric,
  charges_included boolean DEFAULT false,
  charges_amount numeric,
  available_from date,
  minimum_lease_months integer DEFAULT 12,
  available_for_visits boolean DEFAULT true,
  images jsonb DEFAULT '[]'::jsonb,
  video_tour_url text,
  virtual_tour_url text,
  features jsonb DEFAULT '{}'::jsonb,
  amenities jsonb DEFAULT '[]'::jsonb,
  is_anonymous boolean DEFAULT false,
  is_public boolean DEFAULT true,
  is_verified boolean DEFAULT false,
  featured boolean DEFAULT false,
  views_count integer DEFAULT 0,
  favorites_count integer DEFAULT 0,
  applications_count integer DEFAULT 0,
  property_code text UNIQUE,
  external_references jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_viewed_at timestamp with time zone,
  property_category text DEFAULT 'residentiel'::text,
  main_image text,
  ansut_verified boolean DEFAULT false,
  ansut_verification_date timestamp with time zone,
  ansut_certificate_url text,
  managed_by_agency uuid,
  CONSTRAINT properties_pkey PRIMARY KEY (id),
  CONSTRAINT properties_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT properties_managed_by_agency_fkey FOREIGN KEY (managed_by_agency) REFERENCES public.agencies(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON public.properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_managed_by_agency ON public.properties(managed_by_agency);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON public.properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_city ON public.properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_price ON public.properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_bedrooms ON public.properties(bedrooms);
CREATE INDEX IF NOT EXISTS idx_properties_is_public ON public.properties(is_public);
CREATE INDEX IF NOT EXISTS idx_properties_featured ON public.properties(featured);
CREATE INDEX IF NOT EXISTS idx_properties_is_verified ON public.properties(is_verified);
CREATE INDEX IF NOT EXISTS idx_properties_ansut_verified ON public.properties(ansut_verified);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON public.properties(created_at);

-- Comments
COMMENT ON TABLE public.properties IS 'Property listings';
COMMENT ON COLUMN public.properties.property_type IS 'Type: apartment, house, studio, villa, duplex, room, office, retail, warehouse, land';
COMMENT ON COLUMN public.properties.status IS 'Status: available, rented, unavailable, pending, maintenance, inactive';
COMMENT ON COLUMN public.properties.ansut_verified IS 'ANSUT verification status';

-- RLS Policies
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.properties
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Everyone can view public properties
CREATE POLICY "Everyone can view public properties" ON public.properties
  FOR SELECT
  TO authenticated, anon
  USING (is_public = true);

-- Property owners can view all their properties
CREATE POLICY "Owners can view own properties" ON public.properties
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Agency agents can view managed properties
CREATE POLICY "Agency agents can view managed properties" ON public.properties
  FOR SELECT
  TO authenticated
  USING (
    managed_by_agency IN (
      SELECT id FROM public.agencies WHERE id = auth.uid()
    )
  );

-- Property owners can insert properties
CREATE POLICY "Owners can insert properties" ON public.properties
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Property owners can update their properties
CREATE POLICY "Owners can update own properties" ON public.properties
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Updated at trigger
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- View: properties_with_monthly_rent
-- Exposes properties with a normalized monthly_rent (based on price)
CREATE OR REPLACE VIEW public.properties_with_monthly_rent AS
SELECT
  p.address,
  p.amenities,
  p.ansut_certificate_url,
  p.ansut_verification_date,
  p.ansut_verified,
  p.applications_count,
  p.available_for_visits,
  p.available_from,
  p.bathrooms,
  p.bedrooms,
  p.charges_amount,
  p.charges_included,
  p.city,
  p.coordinates,
  p.created_at,
  p.deposit_amount,
  p.description,
  p.external_references,
  p.favorites_count,
  p.featured,
  p.features,
  p.floor_number,
  p.furnished,
  p.has_ac,
  p.has_elevator,
  p.has_garden,
  p.has_parking,
  p.id,
  p.images,
  p.is_anonymous,
  p.is_public,
  p.is_verified,
  p.last_viewed_at,
  p.latitude,
  p.longitude,
  p.main_image,
  p.minimum_lease_months,
  p.price AS monthly_rent,
  p.neighborhood,
  p.owner_id,
  p.property_category,
  p.property_code,
  p.property_type,
  p.rooms,
  p.status,
  p.surface_area,
  p.title,
  p.updated_at,
  p.video_tour_url,
  p.views_count,
  p.virtual_tour_url,
  p.year_built
FROM public.properties p;

ALTER VIEW public.properties_with_monthly_rent SET (security_invoker = true);
GRANT SELECT ON public.properties_with_monthly_rent TO anon, authenticated;
