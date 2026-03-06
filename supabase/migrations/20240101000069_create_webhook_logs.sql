-- Migration: Create webhook_logs table
-- Description: Webhook event logs
-- Order: Sixty-ninth table (no foreign keys)

CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  webhook_type text NOT NULL,
  processing_result text NOT NULL,
  payload jsonb,
  signature_provided text,
  signature_valid boolean,
  source_ip text,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT webhook_logs_pkey PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_type ON public.webhook_logs(webhook_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processing_result ON public.webhook_logs(processing_result);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.webhook_logs(created_at);

-- Comments
COMMENT ON TABLE public.webhook_logs IS 'Webhook event logs';

-- RLS Policies
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.webhook_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- No other access - webhook logs are internal
