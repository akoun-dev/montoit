-- Migration: Create admin_login_attempts table
-- Description: Admin login attempt tracking
-- Order: Sixty-fourth table (references profiles)

CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  success boolean DEFAULT false,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_login_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT admin_login_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_user_id ON public.admin_login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_email ON public.admin_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_success ON public.admin_login_attempts(success);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_ip_address ON public.admin_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_created_at ON public.admin_login_attempts(created_at);

-- Comments
COMMENT ON TABLE public.admin_login_attempts IS 'Admin login attempt tracking';

-- RLS Policies
ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.admin_login_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can view all login attempts
CREATE POLICY "Admins can view login attempts" ON public.admin_login_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type = 'admin'::user_type
      
    )
  );

-- No insert/update - login attempts are system-generated
