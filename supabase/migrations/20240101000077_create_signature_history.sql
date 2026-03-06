-- Migration: Create signature_history table
-- Description: Signature event history tracking
-- Order: Seventy-seventh table (references lease_contracts, profiles)

CREATE TABLE IF NOT EXISTS public.signature_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lease_id uuid,
  user_id uuid,
  action text,
  status text,
  otp_code text,
  document_url text,
  metadata jsonb,
  signature_data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT signature_history_pkey PRIMARY KEY (id),
  CONSTRAINT signature_history_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES public.lease_contracts(id) ON DELETE SET NULL,
  CONSTRAINT signature_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_signature_history_lease_id ON public.signature_history(lease_id);
CREATE INDEX IF NOT EXISTS idx_signature_history_user_id ON public.signature_history(user_id);
CREATE INDEX IF NOT EXISTS idx_signature_history_action ON public.signature_history(action);
CREATE INDEX IF NOT EXISTS idx_signature_history_status ON public.signature_history(status);
CREATE INDEX IF NOT EXISTS idx_signature_history_created_at ON public.signature_history(created_at);

-- Comments
COMMENT ON TABLE public.signature_history IS 'Signature event history tracking';

-- RLS Policies
ALTER TABLE public.signature_history ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.signature_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own signature history
CREATE POLICY "Users can view own signature history" ON public.signature_history
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Lease participants can view signature history for their leases
CREATE POLICY "Participants can view lease signature history" ON public.signature_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lease_contracts
      WHERE id = lease_id
      AND (tenant_id = auth.uid() OR owner_id = auth.uid() OR agency_id = auth.uid())
    )
  );

-- No insert/update - signature history is system-generated
