-- Migration: Create verification_documents table
-- Description: Documents for verification applications
-- Order: Eighty-fourth table (references verification_applications, profiles)

CREATE TABLE IF NOT EXISTS public.verification_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  document_type text NOT NULL,
  document_url text NOT NULL,
  file_name text,
  file_size integer,
  mime_type text,
  verification_status text DEFAULT 'pending'::text CHECK (verification_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  verified_by uuid,
  verified_at timestamp with time zone,
  verification_notes text,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT verification_documents_pkey PRIMARY KEY (id),
  CONSTRAINT verification_documents_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.verification_applications(id) ON DELETE CASCADE,
  CONSTRAINT verification_documents_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_verification_documents_application_id ON public.verification_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_verification_documents_document_type ON public.verification_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_verification_documents_verification_status ON public.verification_documents(verification_status);
CREATE INDEX IF NOT EXISTS idx_verification_documents_verified_by ON public.verification_documents(verified_by);
CREATE INDEX IF NOT EXISTS idx_verification_documents_uploaded_at ON public.verification_documents(uploaded_at);

-- Comments
COMMENT ON TABLE public.verification_documents IS 'Documents for verification applications';

-- RLS Policies
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.verification_documents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own documents
CREATE POLICY "Users can view own documents" ON public.verification_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.verification_applications
      WHERE id = application_id AND user_id = auth.uid()
    )
  );

-- Property owners can view tenant documents for their properties
DROP POLICY IF EXISTS "Owners can view tenant verification documents" ON public.verification_documents;
CREATE POLICY "Owners can view tenant verification documents" ON public.verification_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.verification_applications va
      WHERE va.id = application_id
        AND public.can_owner_view_tenant_dossier(va.user_id)
    )
  );

-- Trust agents can view all documents
CREATE POLICY "Trust agents can view documents" ON public.verification_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type IN ('admin'::user_type, 'trust_agent'::user_type)
      
    )
  );

-- Users can insert their own documents
CREATE POLICY "Users can insert own documents" ON public.verification_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.verification_applications
      WHERE id = application_id AND user_id = auth.uid()
    )
  );

-- Trust agents can verify documents
CREATE POLICY "Trust agents can verify documents" ON public.verification_documents
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
