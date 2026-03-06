-- Migration: Create api_rate_limit_configs table
-- Description: API rate limiting configurations
-- Order: Fifty-fifth table (no foreign keys)

CREATE TABLE IF NOT EXISTS public.api_rate_limit_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  endpoint_pattern text NOT NULL UNIQUE,
  max_requests_per_minute integer NOT NULL DEFAULT 60,
  max_requests_per_hour integer NOT NULL DEFAULT 1000,
  is_active boolean DEFAULT true,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT api_rate_limit_configs_pkey PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_rate_limit_configs_endpoint_pattern ON public.api_rate_limit_configs(endpoint_pattern);
CREATE INDEX IF NOT EXISTS idx_api_rate_limit_configs_is_active ON public.api_rate_limit_configs(is_active);

-- Comments
COMMENT ON TABLE public.api_rate_limit_configs IS 'API rate limiting configurations';

-- RLS Policies
ALTER TABLE public.api_rate_limit_configs ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.api_rate_limit_configs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- No other access - rate limit configs are internal
