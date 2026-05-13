-- Migration: Create user_verifications table
-- Description: User verification records
-- Order: Twenty-fourth table (references profiles)

CREATE TABLE IF NOT EXISTS public.user_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  verification_type verification_type NOT NULL,
  status verification_status DEFAULT 'pending'::verification_status,
  documents jsonb DEFAULT '[]'::jsonb,
  verification_data jsonb DEFAULT '{}'::jsonb,
  verified_at timestamp with time zone,
  verified_by uuid,
  notes text,
  expiry_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_verifications_pkey PRIMARY KEY (id),
  CONSTRAINT user_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_verifications_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_verifications_user_id ON public.user_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_verifications_verification_type ON public.user_verifications(verification_type);
CREATE INDEX IF NOT EXISTS idx_user_verifications_status ON public.user_verifications(status);
CREATE INDEX IF NOT EXISTS idx_user_verifications_verified_by ON public.user_verifications(verified_by);
CREATE INDEX IF NOT EXISTS idx_user_verifications_created_at ON public.user_verifications(created_at);

-- Comments
COMMENT ON TABLE public.user_verifications IS 'User verification records';
COMMENT ON COLUMN public.user_verifications.verification_type IS 'Type: identity, income, employment, bank, rental_history, property, agency';
COMMENT ON COLUMN public.user_verifications.status IS 'Status: pending, in_progress, approved, rejected, expired';

-- RLS Policies
ALTER TABLE public.user_verifications ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.user_verifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own verifications
CREATE POLICY "Users can view own verifications" ON public.user_verifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Trust agents and admins can view all verifications
CREATE POLICY "Trust agents and admins can view verifications" ON public.user_verifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type IN ('admin'::user_type, 'trust_agent'::user_type)
      
    )
  );

-- Users can insert their own verifications
CREATE POLICY "Users can insert own verifications" ON public.user_verifications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Trust agents and admins can update verifications
CREATE POLICY "Trust agents and admins can update verifications" ON public.user_verifications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type IN ('admin'::user_type, 'trust_agent'::user_type)
      
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type IN ('admin'::user_type, 'trust_agent'::user_type)
      
    )
  );

-- Updated at trigger
CREATE TRIGGER update_user_verifications_updated_at
  BEFORE UPDATE ON public.user_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
