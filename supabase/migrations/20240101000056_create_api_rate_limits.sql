-- Migration: Create api_rate_limits table
-- Description: API rate limiting tracking
-- Order: Fifty-sixth table (references profiles)

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  endpoint text NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  window_end timestamp with time zone NOT NULL DEFAULT (now() + '00:01:00'::interval),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT api_rate_limits_pkey PRIMARY KEY (id),
  CONSTRAINT api_rate_limits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_user_id ON public.api_rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_endpoint ON public.api_rate_limits(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window_end ON public.api_rate_limits(window_end);

-- Comments
COMMENT ON TABLE public.api_rate_limits IS 'API rate limiting tracking';

-- RLS Policies
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.api_rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- No other access - rate limit tracking is internal
