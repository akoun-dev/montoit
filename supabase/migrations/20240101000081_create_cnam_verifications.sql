-- Migration: Create cnam_verifications table
-- Description: CNAM (health insurance) verification records
-- Order: Eighty-first table (references profiles)

CREATE TABLE IF NOT EXISTS public.cnam_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text,
  request_id text,
  cnam_response jsonb,
  verification_result jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cnam_verifications_pkey PRIMARY KEY (id),
  CONSTRAINT cnam_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cnam_verifications_user_id ON public.cnam_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_cnam_verifications_status ON public.cnam_verifications(status);
CREATE INDEX IF NOT EXISTS idx_cnam_verifications_request_id ON public.cnam_verifications(request_id);
CREATE INDEX IF NOT EXISTS idx_cnam_verifications_created_at ON public.cnam_verifications(created_at);

-- Comments
COMMENT ON TABLE public.cnam_verifications IS 'CNAM (health insurance) verification records';

-- RLS Policies
ALTER TABLE public.cnam_verifications ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.cnam_verifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own verifications
CREATE POLICY "Users can view own verifications" ON public.cnam_verifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Trust agents can view all verifications
CREATE POLICY "Trust agents can view verifications" ON public.cnam_verifications
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
CREATE TRIGGER update_cnam_verifications_updated_at
  BEFORE UPDATE ON public.cnam_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
