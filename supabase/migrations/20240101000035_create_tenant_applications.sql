-- Migration: Create tenant_applications table
-- Description: Tenant verification applications
-- Order: Thirty-fifth table (references profiles)

CREATE TABLE IF NOT EXISTS public.tenant_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  date_of_birth date,
  national_id text,
  occupation text,
  monthly_income numeric,
  employment_status text,
  employer_name text,
  employer_contact text,
  current_address text,
  has_pets boolean DEFAULT false,
  pets_description text,
  family_size integer DEFAULT 1,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  id_document_url text,
  id_document_verified boolean DEFAULT false,
  id_document_verified_at timestamp with time zone,
  income_proof_url text,
  income_proof_verified boolean DEFAULT false,
  income_proof_verified_at timestamp with time zone,
  employment_proof_url text,
  employment_proof_verified boolean DEFAULT false,
  employment_proof_verified_at timestamp with time zone,
  bank_statement_url text,
  bank_statement_verified boolean DEFAULT false,
  bank_statement_verified_at timestamp with time zone,
  rental_history_url text,
  rental_history_verified boolean DEFAULT false,
  rental_history_verified_at timestamp with time zone,
  verification_status text DEFAULT 'pending'::text CHECK (verification_status = ANY (ARRAY['pending'::text, 'in_review'::text, 'approved'::text, 'rejected'::text])),
  submitted_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  rejection_reason text,
  notes text,
  reference_data jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT tenant_applications_pkey PRIMARY KEY (id),
  CONSTRAINT tenant_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT tenant_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenant_applications_user_id ON public.tenant_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_applications_email ON public.tenant_applications(email);
CREATE INDEX IF NOT EXISTS idx_tenant_applications_verification_status ON public.tenant_applications(verification_status);
CREATE INDEX IF NOT EXISTS idx_tenant_applications_reviewed_by ON public.tenant_applications(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_tenant_applications_submitted_at ON public.tenant_applications(submitted_at);

-- Comments
COMMENT ON TABLE public.tenant_applications IS 'Tenant verification applications';
COMMENT ON COLUMN public.tenant_applications.verification_status IS 'Status: pending, in_review, approved, rejected';

-- RLS Policies
ALTER TABLE public.tenant_applications ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.tenant_applications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own applications
CREATE POLICY "Users can view own applications" ON public.tenant_applications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Trust agents and admins can view all applications
CREATE POLICY "Trust agents can view applications" ON public.tenant_applications
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
CREATE POLICY "Users can insert own applications" ON public.tenant_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Trust agents and admins can update applications
CREATE POLICY "Trust agents can update applications" ON public.tenant_applications
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
