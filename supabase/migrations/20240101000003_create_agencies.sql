-- Migration: Create agencies table
-- Description: Real estate agency profiles
-- Order: Third table (references profiles)

CREATE TABLE IF NOT EXISTS public.agencies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agency_name text NOT NULL,
  email text,
  phone text,
  website text,
  address text,
  city text,
  description text,
  commission_rate numeric DEFAULT 8,
  registration_number text,
  logo_url text,
  status text,
  is_verified boolean DEFAULT false,
  verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_ansut_certified boolean DEFAULT false,
  ansut_certification_number text UNIQUE,
  ansut_certification_date date,
  ansut_certification_expiry date,
  department text,
  country text DEFAULT 'Côte d''Ivoire'::text,
  legal_form text,
  CONSTRAINT agencies_pkey PRIMARY KEY (id),
  CONSTRAINT agencies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agencies_user_id ON public.agencies(user_id);
CREATE INDEX IF NOT EXISTS idx_agencies_email ON public.agencies(email);
CREATE INDEX IF NOT EXISTS idx_agencies_city ON public.agencies(city);
CREATE INDEX IF NOT EXISTS idx_agencies_is_verified ON public.agencies(is_verified);
CREATE INDEX IF NOT EXISTS idx_agencies_is_ansut_certified ON public.agencies(is_ansut_certified);
CREATE INDEX IF NOT EXISTS idx_agencies_status ON public.agencies(status);

-- Comments
COMMENT ON TABLE public.agencies IS 'Real estate agency profiles';
COMMENT ON COLUMN public.agencies.is_ansut_certified IS 'ANSUT certification status';
COMMENT ON COLUMN public.agencies.commission_rate IS 'Default commission rate percentage';
COMMENT ON COLUMN public.agencies.legal_form IS 'Legal form: SARL, SA, EURL, etc.';

-- RLS Policies
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.agencies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Everyone can view agencies
CREATE POLICY "Everyone can view agencies" ON public.agencies
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Agency users can update their agency
CREATE POLICY "Agency users can update own agency" ON public.agencies
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Agency users can insert agency
CREATE POLICY "Users can insert agency" ON public.agencies
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Updated at trigger
CREATE TRIGGER update_agencies_updated_at
  BEFORE UPDATE ON public.agencies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
