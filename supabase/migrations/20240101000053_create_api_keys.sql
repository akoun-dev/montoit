-- Migration: Create api_keys table
-- Description: External service API keys
-- Order: Fifty-third table (no foreign keys)

CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  api_key text NOT NULL,
  api_secret text,
  config jsonb,
  is_active boolean DEFAULT true,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT api_keys_pkey PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_service_name ON public.api_keys(service_name);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON public.api_keys(is_active);

-- Comments
COMMENT ON TABLE public.api_keys IS 'External service API keys (encrypted)';

-- RLS Policies
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.api_keys
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- No other access - API keys are sensitive

-- Updated at trigger
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
