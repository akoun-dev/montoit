-- Migration: Create sms_logs table
-- Description: SMS message logs
-- Order: Sixty-sixth table (no foreign keys)

CREATE TABLE IF NOT EXISTS public.sms_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message text NOT NULL,
  phone text NOT NULL,
  provider text NOT NULL,
  status text NOT NULL,
  transaction_id text,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sms_logs_pkey PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sms_logs_phone ON public.sms_logs(phone);
CREATE INDEX IF NOT EXISTS idx_sms_logs_provider ON public.sms_logs(provider);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON public.sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_transaction_id ON public.sms_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON public.sms_logs(created_at);

-- Comments
COMMENT ON TABLE public.sms_logs IS 'SMS message logs';

-- RLS Policies
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.sms_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- No other access - SMS logs are sensitive
