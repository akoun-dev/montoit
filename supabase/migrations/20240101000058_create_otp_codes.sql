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

-- Service role full access (for Edge Functions)
CREATE POLICY "Service role full access" ON public.otp_codes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow insert OTP codes for all roles
-- This is needed for OTP generation during auth flow (both anonymous and authenticated)
-- Security: Rate limiting is applied at application/Edge Function level
CREATE POLICY "Allow insert OTP codes" ON public.otp_codes
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow select by recipient (for OTP verification)
-- Authenticated users can select OTPs for their own email/phone
CREATE POLICY "Allow select OTP codes by recipient" ON public.otp_codes
FOR SELECT
TO authenticated
USING (
  recipient = auth.uid()::text
  OR recipient = (auth.jwt()::json->>'email')
  OR recipient = (auth.jwt()::json->>'phone')
);

-- Allow service role to select all OTPs (for verification in Edge Functions)
CREATE POLICY "Allow service role select all OTP codes" ON public.otp_codes
FOR SELECT
TO service_role
USING (true);

-- Allow update for marking OTP as used
CREATE POLICY "Allow update OTP codes" ON public.otp_codes
FOR UPDATE
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- Updated at trigger
CREATE TRIGGER update_otp_codes_updated_at
  BEFORE UPDATE ON public.otp_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
