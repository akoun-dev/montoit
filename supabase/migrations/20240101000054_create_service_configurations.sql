-- Migration: Create service_configurations table
-- Description: External service configurations
-- Order: Fifty-fourth table (no foreign keys)

CREATE TABLE IF NOT EXISTS public.service_configurations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  provider text NOT NULL,
  config jsonb,
  is_enabled boolean DEFAULT true,
  priority integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT service_configurations_pkey PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_configurations_service_name ON public.service_configurations(service_name);
CREATE INDEX IF NOT EXISTS idx_service_configurations_provider ON public.service_configurations(provider);
CREATE INDEX IF NOT EXISTS idx_service_configurations_is_enabled ON public.service_configurations(is_enabled);
CREATE INDEX IF NOT EXISTS idx_service_configurations_priority ON public.service_configurations(priority);

-- Comments
COMMENT ON TABLE public.service_configurations IS 'External service configurations';

-- RLS Policies
ALTER TABLE public.service_configurations ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.service_configurations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- No other access - service configurations are sensitive

-- Updated at trigger
CREATE TRIGGER update_service_configurations_updated_at
  BEFORE UPDATE ON public.service_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
