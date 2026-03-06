-- Migration: Create otp_codes table
-- Description: OTP codes for verification
-- Order: Fifty-eighth table (no foreign keys)

CREATE TABLE IF NOT EXISTS public.otp_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  code text NOT NULL,
  method text NOT NULL CHECK (method = ANY (ARRAY['email'::text, 'sms'::text, 'whatsapp'::text])),
  purpose text DEFAULT 'auth'::text CHECK (purpose = ANY (ARRAY['email_verification'::text, 'password_reset'::text, 'phone_verification'::text, 'auth'::text])),
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false,
  used_at timestamp with time zone,
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT otp_codes_pkey PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_otp_codes_recipient ON public.otp_codes(recipient);
CREATE INDEX IF NOT EXISTS idx_otp_codes_code ON public.otp_codes(code);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON public.otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_codes_used ON public.otp_codes(used);
CREATE INDEX IF NOT EXISTS idx_otp_codes_purpose ON public.otp_codes(purpose);

-- Comments
COMMENT ON TABLE public.otp_codes IS 'OTP codes for verification';

-- RLS Policies
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.otp_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can insert OTP codes only for their own email or phone
-- This prevents users from inserting OTPs for other recipients
CREATE POLICY "Users can insert own OTP codes" ON public.otp_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    recipient = current_setting('request.jwt.claims', true)::json->>'email'
    OR recipient = current_setting('request.jwt.claims', true)::json->>'phone'
  );

-- Allow anonymous insert for OTP generation during auth flow
-- Security note: This is needed for phone-based auth where user is not yet authenticated.
-- Rate limiting should be applied at the application/Edge Function level.
-- Future improvement: Move OTP generation/storage to Edge Function with service role.
CREATE POLICY "Allow anonymous insert for OTP" ON public.otp_codes
  FOR INSERT
  TO anon
  WITH CHECK (
    -- Only allow new OTP creation (cannot modify existing)
    used = false
    AND attempts = 0
    -- Basic validation to prevent abuse could be added here
  );

-- Allow anonymous select by recipient (for verification via service role only)
-- Note: This policy is restrictive but may not be needed if verification is done via service role
CREATE POLICY "Allow anonymous select by recipient" ON public.otp_codes
  FOR SELECT
  TO anon
  USING (recipient = current_setting('request.jwt.claims', true)::json->>'email' OR recipient = current_setting('request.jwt.claims', true)::json->>'phone');

-- Allow authenticated select by recipient
CREATE POLICY "Allow authenticated select by recipient" ON public.otp_codes
  FOR SELECT
  TO authenticated
  USING (recipient = current_setting('request.jwt.claims', true)::json->>'email' OR recipient = current_setting('request.jwt.claims', true)::json->>'phone');

-- Updated at trigger
CREATE TRIGGER update_otp_codes_updated_at
  BEFORE UPDATE ON public.otp_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
