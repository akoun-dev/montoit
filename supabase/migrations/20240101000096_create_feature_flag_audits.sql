-- Migration: Create feature_flag_audits table
-- Description: Feature flag change audit logs
-- Order: Ninety-sixth table (references feature_flags, profiles)

CREATE TABLE IF NOT EXISTS public.feature_flag_audits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  flag_id uuid,
  old_value jsonb,
  new_value jsonb,
  changed_by uuid,
  rollback_data jsonb,
  changed_at timestamp with time zone DEFAULT now(),
  description text,
  CONSTRAINT feature_flag_audits_pkey PRIMARY KEY (id),
  CONSTRAINT feature_flag_audits_flag_id_fkey FOREIGN KEY (flag_id) REFERENCES public.feature_flags(id) ON DELETE SET NULL,
  CONSTRAINT feature_flag_audits_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_flag_audits_flag_id ON public.feature_flag_audits(flag_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_audits_changed_by ON public.feature_flag_audits(changed_by);
CREATE INDEX IF NOT EXISTS idx_feature_flag_audits_changed_at ON public.feature_flag_audits(changed_at);

-- Comments
COMMENT ON TABLE public.feature_flag_audits IS 'Feature flag change audit logs';

-- RLS Policies
ALTER TABLE public.feature_flag_audits ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.feature_flag_audits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can view all audit logs
CREATE POLICY "Admins can view audit logs" ON public.feature_flag_audits
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
