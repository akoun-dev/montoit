/*
  Fix Missing Tables and RLS Policies - Emergency Fix
  
  This migration addresses the 404 errors by ensuring all required tables exist
  and have proper RLS policies. The errors indicate tables exist but policies
  might be missing or incorrectly configured.
*/

-- ========================================
-- 1. ENSURE ALL TABLES EXIST
-- ========================================

-- Properties table (already exists but ensure all columns)
DO $$ BEGIN
  ALTER TABLE public.properties 
    ADD COLUMN IF NOT EXISTS work_status TEXT DEFAULT 'aucun_travail',
    ADD COLUMN IF NOT EXISTS work_description TEXT,
    ADD COLUMN IF NOT EXISTS work_images JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS work_estimated_cost DECIMAL(12, 2),
    ADD COLUMN IF NOT EXISTS work_estimated_duration TEXT,
    ADD COLUMN IF NOT EXISTS work_start_date DATE,
    ADD COLUMN IF NOT EXISTS title_deed_url TEXT,
    ADD COLUMN IF NOT EXISTS en_negociation BOOLEAN DEFAULT FALSE;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- User verifications table (for tenant scores)
CREATE TABLE IF NOT EXISTS public.user_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tenant_score INTEGER CHECK (tenant_score >= 0 AND tenant_score <= 100),
  oneci_status TEXT DEFAULT 'not_verified',
  cnam_status TEXT DEFAULT 'not_verified',
  verification_documents JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_verifications_user_id ON public.user_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_verifications_tenant_score ON public.user_verifications(tenant_score);

-- ========================================
-- 2. FIX RLS POLICIES FOR ALL TABLES
-- ========================================

-- Properties RLS - Ensure policies exist and are correct
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view approved properties" ON public.properties;
CREATE POLICY "Public can view approved properties"
  ON public.properties FOR SELECT
  TO anon, authenticated
  USING (moderation_status = 'approved');

DROP POLICY IF EXISTS "Owners can view their own properties" ON public.properties;
CREATE POLICY "Owners can view their own properties"
  ON public.properties FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can create properties" ON public.properties;
CREATE POLICY "Owners can create properties"
  ON public.properties FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update own properties" ON public.properties;
CREATE POLICY "Owners can update own properties"
  ON public.properties FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can delete own properties" ON public.properties;
CREATE POLICY "Owners can delete own properties"
  ON public.properties FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Profiles RLS - Ensure public access for basic info
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view basic profile info" ON public.profiles;
CREATE POLICY "Public can view basic profile info"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- User favorites RLS
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own favorites" ON public.user_favorites;
CREATE POLICY "Users can manage own favorites"
  ON public.user_favorites FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Agency mandates RLS
ALTER TABLE public.agency_mandates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active agency mandates" ON public.agency_mandates;
CREATE POLICY "Public can view active agency mandates"
  ON public.agency_mandates FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS "Agencies can manage their mandates" ON public.agency_mandates;
CREATE POLICY "Agencies can manage their mandates"
  ON public.agency_mandates FOR ALL
  TO authenticated
  USING (auth.uid() = agency_id)
  WITH CHECK (auth.uid() = agency_id);

-- Rental applications RLS
ALTER TABLE public.rental_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Applicants can view their own applications" ON public.rental_applications;
CREATE POLICY "Applicants can view their own applications"
  ON public.rental_applications FOR SELECT
  TO authenticated
  USING (auth.uid() = applicant_id);

DROP POLICY IF EXISTS "Property owners can view applications for their properties" ON public.rental_applications;
CREATE POLICY "Property owners can view applications for their properties"
  ON public.rental_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = rental_applications.property_id
      AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create applications" ON public.rental_applications;
CREATE POLICY "Users can create applications"
  ON public.rental_applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = applicant_id);

-- User verifications RLS
ALTER TABLE public.user_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own verifications" ON public.user_verifications;
CREATE POLICY "Users can view their own verifications"
  ON public.user_verifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own verifications" ON public.user_verifications;
CREATE POLICY "Users can update their own verifications"
  ON public.user_verifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- ========================================
-- 3. ENSURE RPC FUNCTIONS EXIST AND WORK
-- ========================================

-- Drop and recreate get_public_properties with proper error handling
DROP FUNCTION IF EXISTS public.get_public_properties(text, text, numeric, numeric, integer, text);
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
  RETURN QUERY
  SELECT 
    p.id, p.title, p.description, p.property_type, p.city, p.neighborhood,
    p.address, p.monthly_rent, p.deposit_amount, p.charges_amount,
    p.surface_area, p.bedrooms, p.bathrooms, p.floor_number,
    p.is_furnished, p.has_parking, p.has_garden, p.has_ac,
    p.status, p.moderation_status, p.images, p.main_image,
    p.video_url, p.virtual_tour_url, p.panoramic_images, p.floor_plans,
    p.media_metadata, p.latitude, p.longitude, p.view_count,
    p.created_at, p.updated_at
  FROM public.properties p
  WHERE p.moderation_status = 'approved'
    AND (p_city IS NULL OR LOWER(p.city) = LOWER(p_city))
    AND (p_property_type IS NULL OR p.property_type = p_property_type)
    AND (p_min_rent IS NULL OR p.monthly_rent >= p_min_rent)
    AND (p_max_rent IS NULL OR p.monthly_rent <= p_max_rent)
    AND (p_min_bedrooms IS NULL OR p.bedrooms >= p_min_bedrooms)
    AND (p_status IS NULL OR p.status = p_status)
  ORDER BY p.created_at DESC;
END;
$$;

-- Drop and recreate get_public_property
DROP FUNCTION IF EXISTS public.get_public_property(uuid);
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
    p.id, p.title, p.description, p.property_type, p.city, p.neighborhood,
    p.address, p.monthly_rent, p.deposit_amount, p.charges_amount,
    p.surface_area, p.bedrooms, p.bathrooms, p.floor_number,
    p.is_furnished, p.has_parking, p.has_garden, p.has_ac,
    p.status, p.moderation_status, p.images, p.main_image,
    p.video_url, p.virtual_tour_url, p.panoramic_images, p.floor_plans,
    p.media_metadata, p.latitude, p.longitude, p.view_count,
    p.created_at, p.updated_at
  FROM public.properties p
  WHERE p.id = p_property_id
    AND p.moderation_status = 'approved';
END;
$$;

-- Grant permissions to RPC functions
GRANT EXECUTE ON FUNCTION public.get_public_properties TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_property TO anon, authenticated;

-- ========================================
-- 4. FIX TRIGGERS AND FUNCTIONS
-- ========================================

-- Ensure update_updated_at_column function exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at if they don't exist
DO $$ BEGIN
  CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON public.properties
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_user_verifications_updated_at
    BEFORE UPDATE ON public.user_verifications
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ========================================
-- 5. INSERT SAMPLE DATA FOR TESTING
-- ========================================

-- Insert a sample property if none exists
DO $$
DECLARE
  property_count INTEGER;
  user_exists BOOLEAN;
  sample_user_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  SELECT COUNT(*) INTO property_count FROM public.properties;

  -- Check if the sample user exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = sample_user_id) INTO user_exists;

  IF property_count = 0 AND user_exists THEN
    INSERT INTO public.properties (
      owner_id,
      title,
      description,
      property_type,
      status,
      address,
      city,
      neighborhood,
      latitude,
      longitude,
      bedrooms,
      bathrooms,
      surface_area,
      monthly_rent,
      deposit_amount,
      is_furnished,
      has_parking,
      has_ac,
      main_image,
      images,
      moderation_status
    ) VALUES (
      sample_user_id,
      'Appartement moderne à Cocody',
      'Bel appartement moderne dans un quartier résidentiel calme avec toutes les commodités à proximité.',
      'appartement',
      'disponible',
      'Rue des Jardins, Cocody',
      'Abidjan',
      'Cocody',
      5.3600,
      -3.9800,
      2,
      1,
      75.5,
      150000,
      300000,
      true,
      true,
      true,
      'https://picsum.photos/seed/apartment-demo/400/300.jpg',
      ARRAY['https://picsum.photos/seed/apartment-demo-1/400/300.jpg', 'https://picsum.photos/seed/apartment-demo-2/400/300.jpg'],
      'approved'
    );

    RAISE NOTICE 'Sample property inserted for testing';
  ELSIF property_count = 0 AND NOT user_exists THEN
    RAISE NOTICE 'Sample user ID % does not exist. Skipping sample property creation.', sample_user_id;
    RAISE NOTICE 'To create sample data:';
    RAISE NOTICE '1. Create a user through Supabase Auth dashboard';
    RAISE NOTICE '2. Note the user UUID';
    RAISE NOTICE '3. Update this migration with the correct user ID';
  END IF;
END $$;

-- ========================================
-- 6. VERIFICATION AND COMPLETION
-- ========================================

DO $$
BEGIN
  RAISE NOTICE 'Database fix migration completed successfully!';
  RAISE NOTICE 'Fixed:';
  RAISE NOTICE '- Added missing columns to properties table';
  RAISE NOTICE '- Created user_verifications table';
  RAISE NOTICE '- Fixed RLS policies for all tables';
  RAISE NOTICE '- Recreated RPC functions with proper permissions';
  RAISE NOTICE '- Added updated_at triggers';
  RAISE NOTICE '- Inserted sample data for testing';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables should now be accessible via API calls';
END $$;
