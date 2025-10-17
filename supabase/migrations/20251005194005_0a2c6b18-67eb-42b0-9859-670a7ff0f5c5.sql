-- EPIC 8: Two-Factor Authentication (2FA) Complete Implementation
-- Phase 1: Backend tables and functions

-- Enable pgcrypto for hashing backup codes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Table for MFA backup codes
CREATE TABLE IF NOT EXISTS public.mfa_backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, code_hash)
);

ALTER TABLE public.mfa_backup_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own backup codes"
  ON public.mfa_backup_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own backup codes"
  ON public.mfa_backup_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own used backup codes"
  ON public.mfa_backup_codes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_mfa_backup_codes_user ON public.mfa_backup_codes(user_id);

COMMENT ON TABLE public.mfa_backup_codes IS 'Stores hashed backup codes for 2FA recovery';

-- 2. Extend admin_audit_logs with action_metadata
ALTER TABLE public.admin_audit_logs 
ADD COLUMN IF NOT EXISTS action_metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.admin_audit_logs.action_metadata IS 
'Metadata for 2FA events: {mfa_enabled, mfa_disabled, backup_codes_generated, backup_code_used, login_with_2fa}';

-- 3. Table for MFA login attempts (rate limiting)
CREATE TABLE IF NOT EXISTS public.mfa_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  success BOOLEAN NOT NULL,
  attempt_type TEXT NOT NULL, -- 'totp' or 'backup_code'
  attempt_ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mfa_login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own MFA attempts"
  ON public.mfa_login_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert MFA attempts"
  ON public.mfa_login_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all MFA attempts"
  ON public.mfa_login_attempts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_mfa_attempts_user_time ON public.mfa_login_attempts(user_id, created_at DESC);

COMMENT ON TABLE public.mfa_login_attempts IS 'Tracks MFA login attempts for rate limiting and security monitoring';

-- 4. Table for MFA policies (mandatory 2FA per role)
CREATE TABLE IF NOT EXISTS public.mfa_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL UNIQUE,
  mfa_required BOOLEAN NOT NULL DEFAULT false,
  grace_period_days INTEGER DEFAULT 7,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mfa_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view MFA policies"
  ON public.mfa_policies FOR SELECT
  USING (true);

CREATE POLICY "Only super_admins can update MFA policies"
  ON public.mfa_policies FOR UPDATE
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Only super_admins can insert MFA policies"
  ON public.mfa_policies FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Insert default policies: 2FA mandatory for admin and super_admin
INSERT INTO public.mfa_policies (role, mfa_required, grace_period_days)
VALUES 
  ('admin', true, 7),
  ('super_admin', true, 3),
  ('tiers_de_confiance', false, 0),
  ('user', false, 0)
ON CONFLICT (role) DO NOTHING;

COMMENT ON TABLE public.mfa_policies IS 'Defines MFA requirements per role';

-- 5. Function to verify backup codes
CREATE OR REPLACE FUNCTION public.verify_backup_code(
  _backup_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _code_hash TEXT;
  _code_exists BOOLEAN;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Hash the provided code
  _code_hash := encode(digest(_backup_code, 'sha256'), 'hex');
  
  -- Check if the code exists and hasn't been used
  SELECT EXISTS (
    SELECT 1 FROM public.mfa_backup_codes
    WHERE user_id = _user_id
      AND code_hash = _code_hash
      AND used_at IS NULL
  ) INTO _code_exists;
  
  -- If the code exists, mark it as used
  IF _code_exists THEN
    UPDATE public.mfa_backup_codes
    SET used_at = now()
    WHERE user_id = _user_id
      AND code_hash = _code_hash
      AND used_at IS NULL;
    
    -- Log the backup code usage
    INSERT INTO public.admin_audit_logs (
      admin_id, action_type, target_type, target_id, action_metadata
    ) VALUES (
      _user_id, 'mfa_backup_code_used', 'user', _user_id,
      jsonb_build_object(
        'timestamp', now(), 
        'code_hash_prefix', substring(_code_hash, 1, 8),
        'remaining_codes', (
          SELECT COUNT(*) FROM public.mfa_backup_codes 
          WHERE user_id = _user_id AND used_at IS NULL
        )
      )
    );
  END IF;
  
  RETURN _code_exists;
END;
$$;

COMMENT ON FUNCTION public.verify_backup_code(TEXT) IS 
'Verifies and marks a backup code as used. Returns true if valid and unused.';

-- 6. Function to check MFA rate limit
CREATE OR REPLACE FUNCTION public.check_mfa_rate_limit()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _failed_attempts INTEGER;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Count failed attempts in the last 15 minutes
  SELECT COUNT(*) INTO _failed_attempts
  FROM public.mfa_login_attempts
  WHERE user_id = _user_id
    AND success = false
    AND created_at > (now() - INTERVAL '15 minutes');
  
  -- Block after 5 failed attempts
  RETURN _failed_attempts < 5;
END;
$$;

COMMENT ON FUNCTION public.check_mfa_rate_limit() IS 
'Checks if user has exceeded MFA rate limit (5 failed attempts in 15 minutes)';

-- 7. Function to log MFA attempt
CREATE OR REPLACE FUNCTION public.log_mfa_attempt(
  _success BOOLEAN,
  _attempt_type TEXT DEFAULT 'totp'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.mfa_login_attempts (
    user_id, success, attempt_type, created_at
  ) VALUES (
    auth.uid(), _success, _attempt_type, now()
  );
END;
$$;

COMMENT ON FUNCTION public.log_mfa_attempt(BOOLEAN, TEXT) IS 
'Logs an MFA login attempt (success or failure)';

-- 8. View for MFA metrics
CREATE OR REPLACE VIEW public.mfa_metrics AS
SELECT 
  COUNT(DISTINCT ur.user_id) FILTER (WHERE ur.role IN ('admin', 'super_admin')) as total_admins,
  COUNT(DISTINCT CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.mfa_backup_codes mbc 
      WHERE mbc.user_id = ur.user_id
    ) THEN ur.user_id 
  END) as admins_with_2fa,
  COUNT(*) FILTER (WHERE mbc.used_at IS NULL) as unused_backup_codes,
  COUNT(*) FILTER (WHERE mbc.used_at IS NOT NULL) as used_backup_codes,
  ROUND(
    (COUNT(DISTINCT CASE 
      WHEN EXISTS (
        SELECT 1 FROM public.mfa_backup_codes mbc2 
        WHERE mbc2.user_id = ur.user_id
      ) THEN ur.user_id 
    END)::numeric / 
    NULLIF(COUNT(DISTINCT ur.user_id) FILTER (WHERE ur.role IN ('admin', 'super_admin')), 0)) * 100, 
  2) as percentage_with_2fa
FROM public.user_roles ur
LEFT JOIN public.mfa_backup_codes mbc ON ur.user_id = mbc.user_id
WHERE ur.role IN ('admin', 'super_admin');

COMMENT ON VIEW public.mfa_metrics IS 
'Provides statistics on 2FA adoption among administrators';