-- Migration: Create property_documents table
-- Description: Property-related documents
-- Order: Thirty-second table (references properties, profiles)

CREATE TABLE IF NOT EXISTS public.property_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid,
  owner_id uuid NOT NULL,
  document_type text NOT NULL,
  document_url text NOT NULL,
  document_name text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text])),
  rejection_reason text,
  verified_at timestamp with time zone,
  verified_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT property_documents_pkey PRIMARY KEY (id),
  CONSTRAINT property_documents_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE,
  CONSTRAINT property_documents_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT property_documents_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_property_documents_property_id ON public.property_documents(property_id);
CREATE INDEX IF NOT EXISTS idx_property_documents_owner_id ON public.property_documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_property_documents_document_type ON public.property_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_property_documents_status ON public.property_documents(status);
CREATE INDEX IF NOT EXISTS idx_property_documents_verified_by ON public.property_documents(verified_by);

-- Comments
COMMENT ON TABLE public.property_documents IS 'Property-related documents';

-- RLS Policies
ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.property_documents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Property owners can view their property documents
CREATE POLICY "Owners can view own property documents" ON public.property_documents
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Trust agents and admins can view all property documents
CREATE POLICY "Trust agents can view property documents" ON public.property_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type IN ('admin'::user_type, 'trust_agent'::user_type)
      
    )
  );

-- Property owners can insert documents
CREATE POLICY "Owners can insert property documents" ON public.property_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Property owners can update their documents
CREATE POLICY "Owners can update own property documents" ON public.property_documents
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Trust agents can verify documents
CREATE POLICY "Trust agents can verify documents" ON public.property_documents
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
CREATE TRIGGER update_property_documents_updated_at
  BEFORE UPDATE ON public.property_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
