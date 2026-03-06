-- Migration: Create feature_flag_evaluations table
-- Description: Feature flag evaluation logs
-- Order: Ninety-fifth table (references feature_flags, feature_flag_variants, profiles)

CREATE TABLE IF NOT EXISTS public.feature_flag_evaluations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  flag_id uuid,
  user_id uuid,
  variant_id uuid,
  evaluation boolean NOT NULL,
  evaluated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT feature_flag_evaluations_pkey PRIMARY KEY (id),
  CONSTRAINT feature_flag_evaluations_flag_id_fkey FOREIGN KEY (flag_id) REFERENCES public.feature_flags(id) ON DELETE SET NULL,
  CONSTRAINT feature_flag_evaluations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT feature_flag_evaluations_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.feature_flag_variants(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_flag_evaluations_flag_id ON public.feature_flag_evaluations(flag_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_evaluations_user_id ON public.feature_flag_evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_evaluations_variant_id ON public.feature_flag_evaluations(variant_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_evaluations_evaluation ON public.feature_flag_evaluations(evaluation);
CREATE INDEX IF NOT EXISTS idx_feature_flag_evaluations_evaluated_at ON public.feature_flag_evaluations(evaluated_at);

-- Comments
COMMENT ON TABLE public.feature_flag_evaluations IS 'Feature flag evaluation logs';

-- RLS Policies
ALTER TABLE public.feature_flag_evaluations ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.feature_flag_evaluations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own evaluations
CREATE POLICY "Users can view own evaluations" ON public.feature_flag_evaluations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all evaluations
CREATE POLICY "Admins can view evaluations" ON public.feature_flag_evaluations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type = 'admin'::user_type
      
    )
  );
