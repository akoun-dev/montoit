-- Migration: Create feature_flag_variants table
-- Description: Feature flag variants for multivariate flags
-- Order: Ninety-fourth table (references feature_flags)

CREATE TABLE IF NOT EXISTS public.feature_flag_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  flag_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  percentage integer DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100),
  config jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT feature_flag_variants_pkey PRIMARY KEY (id),
  CONSTRAINT feature_flag_variants_flag_id_fkey FOREIGN KEY (flag_id) REFERENCES public.feature_flags(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_flag_variants_flag_id ON public.feature_flag_variants(flag_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_variants_is_active ON public.feature_flag_variants(is_active);

-- Comments
COMMENT ON TABLE public.feature_flag_variants IS 'Feature flag variants for multivariate flags';

-- RLS Policies
ALTER TABLE public.feature_flag_variants ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.feature_flag_variants
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Everyone can view active variants
CREATE POLICY "Everyone can view active variants" ON public.feature_flag_variants
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.feature_flags
      WHERE id = flag_id 
    )
  );

-- Admins can manage variants
CREATE POLICY "Admins can manage variants" ON public.feature_flag_variants
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
