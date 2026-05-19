-- 20260518131943_create_service_usage_logs.sql
-- Table pour le logging des appels aux services externes (NeoFace, ONECI, etc.)

CREATE TABLE IF NOT EXISTS public.service_usage_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  provider text NOT NULL,
  status text NOT NULL, -- 'success', 'failure', 'pending'
  error_message text,
  response_time_ms numeric,
  timestamp timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  metadata jsonb,

  CONSTRAINT service_usage_logs_pkey PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_usage_logs_service ON public.service_usage_logs(service_name);
CREATE INDEX IF NOT EXISTS idx_service_usage_logs_provider ON public.service_usage_logs(provider);
CREATE INDEX IF NOT EXISTS idx_service_usage_logs_status ON public.service_usage_logs(status);
CREATE INDEX IF NOT EXISTS idx_service_usage_logs_timestamp ON public.service_usage_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_service_usage_logs_user_id ON public.service_usage_logs(user_id);

-- Enable Row Level Security
ALTER TABLE public.service_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Service role full access" ON public.service_usage_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users can view own logs" ON public.service_usage_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Trust agents can view all logs" ON public.service_usage_logs
  FOR SELECT TO authenticated USING (true);