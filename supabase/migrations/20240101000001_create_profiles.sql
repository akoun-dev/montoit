-- Migration: Create profiles table
-- Description: User profiles linked to auth.users
-- Order: First table (references only auth.users)

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  full_name text,
  phone text,
  avatar_url text,
  user_type user_type NOT NULL DEFAULT 'tenant'::user_type,
  is_active boolean DEFAULT true,
  is_verified boolean DEFAULT false,
  profile_setup_completed boolean DEFAULT false,
  address jsonb DEFAULT '{}'::jsonb,
  preferences jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  city text,
  bio text,
  oneci_verified boolean DEFAULT false,
  cnam_verified boolean DEFAULT false,
  facial_verification_status text DEFAULT 'none'::text,
  trust_score numeric DEFAULT 0.0 CHECK (trust_score >= 0::numeric AND trust_score <= 100::numeric),
  reliability_score numeric DEFAULT 0.0 CHECK (reliability_score >= 0::numeric AND reliability_score <= 100::numeric),
  agency_name text,
  agency_description text,
  agency_logo text,
  agency_website text,
  agency_phone text,
  agency_email text,
  documents jsonb DEFAULT '[]'::jsonb,
  facial_verification_date timestamp with time zone,
  facial_verification_score double precision,
  facial_verification_provider text,
  gender text CHECK (gender = ANY (ARRAY['Homme'::text, 'Femme'::text, 'Non spécifié'::text])),
  agency_id uuid,
  verification_documents jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
  -- agency_id FK will be added after agencies table is created (migration 20240101000099)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_agency_id ON public.profiles(agency_id);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON public.profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON public.profiles(is_verified);

-- Comments
COMMENT ON TABLE public.profiles IS 'User profiles linked to Supabase auth';
COMMENT ON COLUMN public.profiles.id IS 'References auth.users.id';
COMMENT ON COLUMN public.profiles.user_type IS 'User type: tenant, owner, agency, trust_agent, admin';
COMMENT ON COLUMN public.profiles.trust_score IS 'Trust score from 0 to 100';
COMMENT ON COLUMN public.profiles.reliability_score IS 'Reliability score from 0 to 100';

-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access" ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view all profiles (authenticated users only)
CREATE POLICY "Users can view profiles" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can view their own profile (even if not fully authenticated yet)
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
