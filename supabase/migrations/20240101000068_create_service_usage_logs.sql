-- Migration: Create service_usage_logs table
-- Description: External service usage logs
-- Order: Sixty-eighth table (no foreign keys)

CREATE TABLE IF NOT EXISTS public.service_usage_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  provider text NOT NULL,
  status text NOT NULL,
  response_time_ms integer,
  error_message text,
  phone text,
  timestamp timestamp with time zone DEFAULT now(),
  CONSTRAINT service_usage_logs_pkey PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_usage_logs_service_name ON public.service_usage_logs(service_name);
CREATE INDEX IF NOT EXISTS idx_service_usage_logs_provider ON public.service_usage_logs(provider);
CREATE INDEX IF NOT EXISTS idx_service_usage_logs_status ON public.service_usage_logs(status);
CREATE INDEX IF NOT EXISTS idx_service_usage_logs_timestamp ON public.service_usage_logs(timestamp);

-- Comments
COMMENT ON TABLE public.service_usage_logs IS 'External service usage logs';

-- RLS Policies
ALTER TABLE public.service_usage_logs ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.service_usage_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- No other access - service logs are internal
