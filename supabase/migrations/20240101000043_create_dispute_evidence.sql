-- Migration: Create dispute_evidence table
-- Description: Evidence documents for disputes
-- Order: Forty-third table (references disputes, profiles)

CREATE TABLE IF NOT EXISTS public.dispute_evidence (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL,
  uploaded_by uuid NOT NULL,
  uploader_role text NOT NULL CHECK (uploader_role = ANY (ARRAY['tenant'::text, 'owner'::text, 'trust_agent'::text, 'admin'::text])),
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size integer,
  description text,
  is_public boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT dispute_evidence_pkey PRIMARY KEY (id),
  CONSTRAINT dispute_evidence_dispute_id_fkey FOREIGN KEY (dispute_id) REFERENCES public.disputes(id) ON DELETE CASCADE,
  CONSTRAINT dispute_evidence_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute_id ON public.dispute_evidence(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_uploaded_by ON public.dispute_evidence(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_uploader_role ON public.dispute_evidence(uploader_role);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_is_public ON public.dispute_evidence(is_public);

-- Comments
COMMENT ON TABLE public.dispute_evidence IS 'Evidence documents for disputes';

-- RLS Policies
ALTER TABLE public.dispute_evidence ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.dispute_evidence
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Dispute participants can view public evidence or their own
CREATE POLICY "Participants can view evidence" ON public.dispute_evidence
  FOR SELECT
  TO authenticated
  USING (
    is_public = true
    OR uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.disputes
      WHERE id = dispute_id
      AND (created_by = auth.uid() OR assigned_to = auth.uid() OR escalated_to = auth.uid())
    )
  );

-- Trust agents can view all evidence
CREATE POLICY "Trust agents can view all evidence" ON public.dispute_evidence
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type IN ('admin'::user_type, 'trust_agent'::user_type)
      
    )
  );

-- Dispute participants can upload evidence
CREATE POLICY "Participants can upload evidence" ON public.dispute_evidence
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.disputes
      WHERE id = dispute_id
      AND (created_by = auth.uid() OR assigned_to = auth.uid() OR escalated_to = auth.uid())
    )
  );
