-- Migration: Create admin_audit_logs table
-- Description: Admin action audit logs
-- Order: Sixty-second table (no foreign keys)

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  action text NOT NULL,
  action_type text,
  entity_type text NOT NULL,
  entity_id uuid,
  user_id uuid,
  user_email text,
  ip_address text,
  admin_id uuid,
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_audit_logs_pkey PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action_type ON public.admin_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_entity_type ON public.admin_audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_entity_id ON public.admin_audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_user_id ON public.admin_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON public.admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at);

-- Comments
COMMENT ON TABLE public.admin_audit_logs IS 'Admin action audit logs';

-- RLS Policies
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.admin_audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can view all audit logs
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type = 'admin'::user_type
      
    )
  );

-- No insert/update - audit logs are system-generated
