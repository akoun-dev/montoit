-- Migration: Create admin_audit_logs_extended table
-- Description: Extended admin action audit logs
-- Order: Sixty-third table (references profiles)

CREATE TABLE IF NOT EXISTS public.admin_audit_logs_extended (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  old_values jsonb DEFAULT '{}'::jsonb,
  new_values jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  request_method text,
  request_path text,
  status_code integer,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_audit_logs_extended_pkey PRIMARY KEY (id),
  CONSTRAINT admin_audit_logs_extended_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_extended_admin_id ON public.admin_audit_logs_extended(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_extended_action ON public.admin_audit_logs_extended(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_extended_entity_type ON public.admin_audit_logs_extended(entity_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_extended_entity_id ON public.admin_audit_logs_extended(entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_extended_ip_address ON public.admin_audit_logs_extended(ip_address);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_extended_created_at ON public.admin_audit_logs_extended(created_at);

-- Comments
COMMENT ON TABLE public.admin_audit_logs_extended IS 'Extended admin action audit logs';

-- RLS Policies
ALTER TABLE public.admin_audit_logs_extended ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.admin_audit_logs_extended
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can view all audit logs
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs_extended
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
