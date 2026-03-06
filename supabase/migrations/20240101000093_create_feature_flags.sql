-- Migration: Create feature_flags table
-- Description: Feature flag configurations
-- Order: Ninety-third table (references profiles)

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  flag_type text NOT NULL CHECK (flag_type = ANY (ARRAY['boolean'::text, 'percentage'::text, 'multivariate'::text])),
  is_active boolean DEFAULT true,
  rollout_percentage integer DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  segment_rules jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT feature_flags_pkey PRIMARY KEY (id),
  CONSTRAINT feature_flags_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_flags_name ON public.feature_flags(name);
CREATE INDEX IF NOT EXISTS idx_feature_flags_is_active ON public.feature_flags(is_active);
CREATE INDEX IF NOT EXISTS idx_feature_flags_flag_type ON public.feature_flags(flag_type);

-- Comments
COMMENT ON TABLE public.feature_flags IS 'Feature flag configurations';
COMMENT ON COLUMN public.feature_flags.flag_type IS 'Type: boolean, percentage, multivariate';

-- RLS Policies
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.feature_flags
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Everyone can view active feature flags
CREATE POLICY "Everyone can view active feature flags" ON public.feature_flags
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins can manage feature flags
CREATE POLICY "Admins can manage feature flags" ON public.feature_flags
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type = 'admin'::user_type
      
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type = 'admin'::user_type
      
    )
  );

-- Updated at trigger
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
