-- Migration: Create recommendation_cache table
-- Description: Cached recommendation results
-- Order: Ninety-seventh table (references profiles)

CREATE TABLE IF NOT EXISTS public.recommendation_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recommendation_type text NOT NULL,
  recommended_items jsonb,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT recommendation_cache_pkey PRIMARY KEY (id),
  CONSTRAINT recommendation_cache_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_user_id ON public.recommendation_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_recommendation_type ON public.recommendation_cache(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_expires_at ON public.recommendation_cache(expires_at);

-- Comments
COMMENT ON TABLE public.recommendation_cache IS 'Cached recommendation results';

-- RLS Policies
ALTER TABLE public.recommendation_cache ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.recommendation_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own cache
CREATE POLICY "Users can view own cache" ON public.recommendation_cache
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- No insert/update - cache is system-generated
