-- Migration: Create trust_agent_profiles table
-- Description: Trust agent profiles and specializations
-- Order: Thirty-ninth table (references profiles, agencies)

CREATE TABLE IF NOT EXISTS public.trust_agent_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'agent'::text,
  agency_id uuid,
  bio text,
  specialties text[],
  assigned_regions text[],
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT trust_agent_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT trust_agent_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT trust_agent_profiles_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trust_agent_profiles_user_id ON public.trust_agent_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_trust_agent_profiles_agency_id ON public.trust_agent_profiles(agency_id);
CREATE INDEX IF NOT EXISTS idx_trust_agent_profiles_is_active ON public.trust_agent_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_trust_agent_profiles_role ON public.trust_agent_profiles(role);

-- Comments
COMMENT ON TABLE public.trust_agent_profiles IS 'Trust agent profiles and specializations';

-- RLS Policies
ALTER TABLE public.trust_agent_profiles ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.trust_agent_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Everyone can view active trust agents
CREATE POLICY "Everyone can view active trust agents" ON public.trust_agent_profiles
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Trust agents can view their own profile
CREATE POLICY "Trust agents can view own profile" ON public.trust_agent_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Updated at trigger
CREATE TRIGGER update_trust_agent_profiles_updated_at
  BEFORE UPDATE ON public.trust_agent_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
