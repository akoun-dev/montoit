-- Migration: Create agency_applications table
-- Description: Agency verification applications
-- Order: Thirty-seventh table (references profiles)

CREATE TABLE IF NOT EXISTS public.agency_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agency_name text NOT NULL,
  email text NOT NULL,
  phone text,
  address text,
  city text,
  country text DEFAULT 'Côte d''Ivoire'::text,
  registration_number text,
  tax_id text,
  registration_document_url text,
  registration_document_verified boolean DEFAULT false,
  registration_document_verified_at timestamp with time zone,
  tax_certificate_url text,
  tax_certificate_verified boolean DEFAULT false,
  tax_certificate_verified_at timestamp with time zone,
  insurance_proof_url text,
  insurance_proof_verified boolean DEFAULT false,
  insurance_proof_verified_at timestamp with time zone,
  verification_status text DEFAULT 'pending'::text CHECK (verification_status = ANY (ARRAY['pending'::text, 'in_review'::text, 'approved'::text, 'rejected'::text])),
  submitted_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  rejection_reason text,
  notes text,
  CONSTRAINT agency_applications_pkey PRIMARY KEY (id),
  CONSTRAINT agency_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT agency_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agency_applications_user_id ON public.agency_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_agency_applications_email ON public.agency_applications(email);
CREATE INDEX IF NOT EXISTS idx_agency_applications_verification_status ON public.agency_applications(verification_status);
CREATE INDEX IF NOT EXISTS idx_agency_applications_reviewed_by ON public.agency_applications(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_agency_applications_submitted_at ON public.agency_applications(submitted_at);

-- Comments
COMMENT ON TABLE public.agency_applications IS 'Agency verification applications';
COMMENT ON COLUMN public.agency_applications.verification_status IS 'Status: pending, in_review, approved, rejected';

-- RLS Policies
ALTER TABLE public.agency_applications ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.agency_applications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own applications
CREATE POLICY "Users can view own applications" ON public.agency_applications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Trust agents and admins can view all applications
CREATE POLICY "Trust agents can view applications" ON public.agency_applications
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
CREATE POLICY "Users can insert own applications" ON public.agency_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Trust agents and admins can update applications
CREATE POLICY "Trust agents can update applications" ON public.agency_applications
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
