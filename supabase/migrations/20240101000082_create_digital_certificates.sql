-- Migration: Create digital_certificates table
-- Description: Digital certificates for users
-- Order: Eighty-second table (references profiles)

CREATE TABLE IF NOT EXISTS public.digital_certificates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  certificate_id text NOT NULL,
  certificate_data jsonb,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT digital_certificates_pkey PRIMARY KEY (id),
  CONSTRAINT digital_certificates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_digital_certificates_user_id ON public.digital_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_digital_certificates_certificate_id ON public.digital_certificates(certificate_id);
CREATE INDEX IF NOT EXISTS idx_digital_certificates_expires_at ON public.digital_certificates(expires_at);

-- Comments
COMMENT ON TABLE public.digital_certificates IS 'Digital certificates for users';

-- RLS Policies
ALTER TABLE public.digital_certificates ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.digital_certificates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own certificates
CREATE POLICY "Users can view own certificates" ON public.digital_certificates
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Trust agents can view all certificates
CREATE POLICY "Trust agents can view certificates" ON public.digital_certificates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type IN ('admin'::user_type, 'trust_agent'::user_type)
      
    )
  );

-- Updated at trigger
CREATE TRIGGER update_digital_certificates_updated_at
  BEFORE UPDATE ON public.digital_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
