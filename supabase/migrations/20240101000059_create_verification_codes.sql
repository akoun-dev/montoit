-- Migration: Create verification_codes table
-- Description: Verification codes for various purposes
-- Order: Fifty-ninth table (references profiles)

CREATE TABLE IF NOT EXISTS public.verification_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  type text NOT NULL,
  email text,
  phone text,
  user_id uuid,
  expires_at timestamp with time zone NOT NULL,
  verified_at timestamp with time zone,
  attempts integer,
  max_attempts integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT verification_codes_pkey PRIMARY KEY (id),
  CONSTRAINT verification_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON public.verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_verification_codes_type ON public.verification_codes(type);
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON public.verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_phone ON public.verification_codes(phone);
CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id ON public.verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON public.verification_codes(expires_at);

-- Comments
COMMENT ON TABLE public.verification_codes IS 'Verification codes for various purposes';

-- RLS Policies
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.verification_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- No other access - verification codes are sensitive
