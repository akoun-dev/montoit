-- Migration: Create login_attempts table
-- Description: Login attempt tracking for security
-- Order: Fifty-seventh table (no foreign keys)

CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  success boolean DEFAULT false,
  ip_address inet,
  user_agent text,
  failure_reason text,
  attempt_time timestamp with time zone DEFAULT now(),
  CONSTRAINT login_attempts_pkey PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON public.login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_success ON public.login_attempts(success);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_address ON public.login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempt_time ON public.login_attempts(attempt_time);

-- Comments
COMMENT ON TABLE public.login_attempts IS 'Login attempt tracking for security';

-- RLS Policies
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.login_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- No other access - login attempts are sensitive security data
