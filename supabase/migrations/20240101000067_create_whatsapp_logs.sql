-- Migration: Create whatsapp_logs table
-- Description: WhatsApp message logs
-- Order: Sixty-seventh table (no foreign keys)

CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message text NOT NULL,
  phone text NOT NULL,
  provider text NOT NULL,
  status text NOT NULL,
  transaction_id text,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT whatsapp_logs_pkey PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_phone ON public.whatsapp_logs(phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_provider ON public.whatsapp_logs(provider);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status ON public.whatsapp_logs(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_transaction_id ON public.whatsapp_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created_at ON public.whatsapp_logs(created_at);

-- Comments
COMMENT ON TABLE public.whatsapp_logs IS 'WhatsApp message logs';

-- RLS Policies
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.whatsapp_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- No other access - WhatsApp logs are sensitive
