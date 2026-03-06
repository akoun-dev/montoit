-- Migration: Create owner_documents table
-- Description: Owner document storage
-- Order: Ninety-eighth table (references auth.users, properties)

CREATE TABLE IF NOT EXISTS public.owner_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  type text,
  category text DEFAULT 'other'::text,
  file_url text NOT NULL,
  file_size bigint,
  status text DEFAULT 'processing'::text,
  tags text[] DEFAULT '{}'::text[],
  signed boolean DEFAULT false,
  signed_at timestamp with time zone,
  property_id uuid,
  ocr_text text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT owner_documents_pkey PRIMARY KEY (id),
  CONSTRAINT owner_documents_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT owner_documents_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_owner_documents_owner_id ON public.owner_documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_documents_property_id ON public.owner_documents(property_id);
CREATE INDEX IF NOT EXISTS idx_owner_documents_type ON public.owner_documents(type);
CREATE INDEX IF NOT EXISTS idx_owner_documents_category ON public.owner_documents(category);
CREATE INDEX IF NOT EXISTS idx_owner_documents_status ON public.owner_documents(status);
CREATE INDEX IF NOT EXISTS idx_owner_documents_tags ON public.owner_documents USING GIN(tags);

-- Comments
COMMENT ON TABLE public.owner_documents IS 'Owner document storage';

-- RLS Policies
ALTER TABLE public.owner_documents ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.owner_documents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Owners can view their own documents
CREATE POLICY "Owners can view own documents" ON public.owner_documents
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Owners can insert their own documents
CREATE POLICY "Owners can insert own documents" ON public.owner_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Owners can update their own documents
CREATE POLICY "Owners can update own documents" ON public.owner_documents
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Owners can delete their own documents
CREATE POLICY "Owners can delete own documents" ON public.owner_documents
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Updated at trigger
CREATE TRIGGER update_owner_documents_updated_at
  BEFORE UPDATE ON public.owner_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
