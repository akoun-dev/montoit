-- Migration: Create mandate_signature_logs table
-- Description: Mandate signature event logs
-- Order: Seventy-eighth table (no foreign keys - mandate_id references agency_mandates)

CREATE TABLE IF NOT EXISTS public.mandate_signature_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mandate_id uuid NOT NULL,
  signer_id uuid NOT NULL,
  signer_type text NOT NULL,
  status text NOT NULL,
  operation_id text,
  ip_address text,
  cryptoneo_response jsonb,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mandate_signature_logs_pkey PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mandate_signature_logs_mandate_id ON public.mandate_signature_logs(mandate_id);
CREATE INDEX IF NOT EXISTS idx_mandate_signature_logs_signer_id ON public.mandate_signature_logs(signer_id);
CREATE INDEX IF NOT EXISTS idx_mandate_signature_logs_status ON public.mandate_signature_logs(status);
CREATE INDEX IF NOT EXISTS idx_mandate_signature_logs_operation_id ON public.mandate_signature_logs(operation_id);
CREATE INDEX IF NOT EXISTS idx_mandate_signature_logs_created_at ON public.mandate_signature_logs(created_at);

-- Comments
COMMENT ON TABLE public.mandate_signature_logs IS 'Mandate signature event logs';

-- RLS Policies
ALTER TABLE public.mandate_signature_logs ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.mandate_signature_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Mandate participants can view signature logs
CREATE POLICY "Participants can view mandate signature logs" ON public.mandate_signature_logs
  FOR SELECT
  TO authenticated
  USING (
    signer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.agency_mandates am
      JOIN public.agencies a ON a.id = am.agency_id
      WHERE am.id = mandate_id AND (am.owner_id = auth.uid() OR a.user_id = auth.uid())
    )
  );

-- No insert/update - signature logs are system-generated
