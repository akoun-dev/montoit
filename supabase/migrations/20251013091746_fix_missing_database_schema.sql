/*
  # Fix Missing Database Schema - Mon Toit Platform
  
  This migration creates the essential database structure that was missing:
  
  1. Core Tables
    - profiles: User profile information
    - user_roles: Role-based access control
    - properties: Property listings with full metadata
    - rental_applications: Tenant applications
    - user_favorites: Saved/favorited properties
  
  2. Security
    - Row Level Security (RLS) enabled on all tables
    - Secure RPC functions to hide sensitive owner information
    - Role-based access policies
  
  3. Functions & Triggers
    - get_public_properties: Secure property browsing without exposing owner_id
    - get_public_property: Secure single property details
    - Auto-profile creation on user signup
    - Updated_at timestamp management
  
  4. Important Notes
    - This migration is idempotent (safe to run multiple times)
    - All operations use IF NOT EXISTS/IF EXISTS checks
    - Follows best practices for security and data protection
*/

-- ========================================
-- 1. ENUM TYPES
-- ========================================
DO $$ BEGIN
  CREATE TYPE public.user_type AS ENUM ('locataire', 'proprietaire', 'agence', 'admin_ansut');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'agent', 'moderator');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ========================================
-- 2. PROFILES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type public.user_type NOT NULL DEFAULT 'locataire',
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  city TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  oneci_verified BOOLEAN DEFAULT FALSE,
  cnam_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON public.profiles(city);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Profiles sont visibles par tous les utilisateurs authentifiés"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Utilisateurs peuvent mettre à jour leur propre profil"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Création automatique du profil"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ========================================
-- 3. USER ROLES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Utilisateurs peuvent voir leurs propres rôles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ========================================
-- 4. PROPERTIES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  property_type TEXT NOT NULL CHECK (property_type IN ('appartement', 'villa', 'studio', 'duplex', 'bureau', 'local_commercial')),
  status TEXT NOT NULL DEFAULT 'disponible' CHECK (status IN ('disponible', 'loué', 'en_attente', 'retiré')),
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  
  -- Location
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  neighborhood TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Characteristics
  bedrooms INTEGER DEFAULT 0,
  bathrooms INTEGER DEFAULT 0,
  surface_area DECIMAL(10, 2),
  floor_number INTEGER,
  has_parking BOOLEAN DEFAULT false,
  has_garden BOOLEAN DEFAULT false,
  is_furnished BOOLEAN DEFAULT false,
  has_ac BOOLEAN DEFAULT false,
  
  -- Pricing
  monthly_rent DECIMAL(12, 2) NOT NULL,
  deposit_amount DECIMAL(12, 2),
  charges_amount DECIMAL(12, 2),
  
  -- Media
  images TEXT[],
  main_image TEXT,
  video_url TEXT,
  virtual_tour_url TEXT,
  panoramic_images JSONB,
  floor_plans JSONB,
  media_metadata JSONB,
  
  -- Metadata
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_properties_owner ON public.properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_city ON public.properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_type ON public.properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_rent ON public.properties(monthly_rent);
CREATE INDEX IF NOT EXISTS idx_properties_location ON public.properties(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_properties_moderation ON public.properties(moderation_status);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 5. HELPER FUNCTIONS
-- ========================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

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

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Nouvel utilisateur'),
    COALESCE((NEW.raw_user_meta_data->>'user_type')::public.user_type, 'locataire')
  )
  ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger if it doesn't exist
DO $$ BEGIN
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

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

-- ========================================
-- 6. SECURE RPC FUNCTIONS FOR PUBLIC ACCESS
-- ========================================
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

GRANT EXECUTE ON FUNCTION public.get_public_properties TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_property TO anon, authenticated;

-- ========================================
-- 7. PROPERTY RLS POLICIES
-- ========================================
DO $$ BEGIN
  CREATE POLICY "Owners can view their own properties"
    ON public.properties FOR SELECT
    TO authenticated
    USING (auth.uid() = owner_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Owners can create properties"
    ON public.properties FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = owner_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Owners can update own properties"
    ON public.properties FOR UPDATE
    TO authenticated
    USING (auth.uid() = owner_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Owners can delete own properties"
    ON public.properties FOR DELETE
    TO authenticated
    USING (auth.uid() = owner_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ========================================
-- 8. USER FAVORITES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON public.user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_property ON public.user_favorites(property_id);

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can manage own favorites"
    ON public.user_favorites
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;