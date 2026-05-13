-- Migration: Create facial_verifications table
-- Description: Facial recognition verification records
-- Order: Eightieth table (references profiles)

CREATE TABLE IF NOT EXISTS public.facial_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL,
  document_id text,
  selfie_url text,
  status text NOT NULL DEFAULT 'pending'::text,
  matching_score double precision,
  is_match boolean DEFAULT false,
  is_live boolean DEFAULT false,
  provider_response jsonb,
  failure_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  verified_at timestamp with time zone,
  CONSTRAINT facial_verifications_pkey PRIMARY KEY (id),
  CONSTRAINT facial_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_facial_verifications_user_id ON public.facial_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_facial_verifications_provider ON public.facial_verifications(provider);
CREATE INDEX IF NOT EXISTS idx_facial_verifications_status ON public.facial_verifications(status);
CREATE INDEX IF NOT EXISTS idx_facial_verifications_document_id ON public.facial_verifications(document_id);
CREATE INDEX IF NOT EXISTS idx_facial_verifications_created_at ON public.facial_verifications(created_at);

-- Comments
COMMENT ON TABLE public.facial_verifications IS 'Facial recognition verification records';

-- RLS Policies
ALTER TABLE public.facial_verifications ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.facial_verifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own verifications
CREATE POLICY "Users can view own verifications" ON public.facial_verifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Trust agents can view all verifications
CREATE POLICY "Trust agents can view verifications" ON public.facial_verifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type IN ('admin'::user_type, 'trust_agent'::user_type)
      
    )
  );

-- Updated at trigger
CREATE TRIGGER update_facial_verifications_updated_at
  BEFORE UPDATE ON public.facial_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
