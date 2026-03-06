-- Migration: Create electronic_signature_logs table
-- Description: Electronic signature event logs
-- Order: Seventy-sixth table (references lease_contracts)

CREATE TABLE IF NOT EXISTS public.electronic_signature_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lease_id uuid NOT NULL,
  initiated_by uuid NOT NULL,
  operation_id text NOT NULL,
  status text NOT NULL,
  cryptoneo_response jsonb,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT electronic_signature_logs_pkey PRIMARY KEY (id),
  CONSTRAINT electronic_signature_logs_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES public.lease_contracts(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_electronic_signature_logs_lease_id ON public.electronic_signature_logs(lease_id);
CREATE INDEX IF NOT EXISTS idx_electronic_signature_logs_operation_id ON public.electronic_signature_logs(operation_id);
CREATE INDEX IF NOT EXISTS idx_electronic_signature_logs_status ON public.electronic_signature_logs(status);
CREATE INDEX IF NOT EXISTS idx_electronic_signature_logs_created_at ON public.electronic_signature_logs(created_at);

-- Comments
COMMENT ON TABLE public.electronic_signature_logs IS 'Electronic signature event logs';

-- RLS Policies
ALTER TABLE public.electronic_signature_logs ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.electronic_signature_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Lease participants can view signature logs for their leases
CREATE POLICY "Participants can view signature logs" ON public.electronic_signature_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lease_contracts
      WHERE id = lease_id
      AND (tenant_id = auth.uid() OR owner_id = auth.uid() OR agency_id = auth.uid())
    )
  );

-- No insert/update - signature logs are system-generated

-- Updated at trigger
CREATE TRIGGER update_electronic_signature_logs_updated_at
  BEFORE UPDATE ON public.electronic_signature_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
