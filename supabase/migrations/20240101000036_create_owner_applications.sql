-- Migration: Create owner_applications table
-- Description: Owner verification applications
-- Order: Thirty-sixth table (references profiles)

CREATE TABLE IF NOT EXISTS public.owner_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  date_of_birth date,
  national_id text,
  address text,
  city text,
  country text DEFAULT 'Côte d''Ivoire'::text,
  id_document_url text,
  id_document_verified boolean DEFAULT false,
  id_document_verified_at timestamp with time zone,
  property_proof_url text,
  property_proof_verified boolean DEFAULT false,
  property_proof_verified_at timestamp with time zone,
  income_proof_url text,
  income_proof_verified boolean DEFAULT false,
  income_proof_verified_at timestamp with time zone,
  verification_status text DEFAULT 'pending'::text CHECK (verification_status = ANY (ARRAY['pending'::text, 'in_review'::text, 'approved'::text, 'rejected'::text])),
  submitted_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  rejection_reason text,
  notes text,
  CONSTRAINT owner_applications_pkey PRIMARY KEY (id),
  CONSTRAINT owner_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT owner_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_owner_applications_user_id ON public.owner_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_owner_applications_email ON public.owner_applications(email);
CREATE INDEX IF NOT EXISTS idx_owner_applications_verification_status ON public.owner_applications(verification_status);
CREATE INDEX IF NOT EXISTS idx_owner_applications_reviewed_by ON public.owner_applications(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_owner_applications_submitted_at ON public.owner_applications(submitted_at);

-- Comments
COMMENT ON TABLE public.owner_applications IS 'Owner verification applications';
COMMENT ON COLUMN public.owner_applications.verification_status IS 'Status: pending, in_review, approved, rejected';

-- RLS Policies
ALTER TABLE public.owner_applications ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.owner_applications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own applications
CREATE POLICY "Users can view own applications" ON public.owner_applications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Trust agents and admins can view all applications
CREATE POLICY "Trust agents can view applications" ON public.owner_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type IN ('admin'::user_type, 'trust_agent'::user_type)
      
    )
  );

-- Users can insert their own applications
CREATE POLICY "Users can insert own applications" ON public.owner_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Trust agents and admins can update applications
CREATE POLICY "Trust agents can update applications" ON public.owner_applications
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
