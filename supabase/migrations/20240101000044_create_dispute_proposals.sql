-- Migration: Create dispute_proposals table
-- Description: Settlement proposals for disputes
-- Order: Forty-fourth table (references disputes, profiles)

CREATE TABLE IF NOT EXISTS public.dispute_proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL,
  proposed_by uuid NOT NULL,
  proposal_type text NOT NULL CHECK (proposal_type = ANY (ARRAY['refund'::text, 'compensation'::text, 'payment_plan'::text, 'other'::text])),
  amount numeric,
  description text NOT NULL,
  tenant_accepted boolean,
  owner_accepted boolean,
  tenant_response_notes text,
  owner_response_notes text,
  expires_at timestamp with time zone,
  accepted_at timestamp with time zone,
  rejected_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT dispute_proposals_pkey PRIMARY KEY (id),
  CONSTRAINT dispute_proposals_dispute_id_fkey FOREIGN KEY (dispute_id) REFERENCES public.disputes(id) ON DELETE CASCADE,
  CONSTRAINT dispute_proposals_proposed_by_fkey FOREIGN KEY (proposed_by) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dispute_proposals_dispute_id ON public.dispute_proposals(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_proposals_proposed_by ON public.dispute_proposals(proposed_by);
CREATE INDEX IF NOT EXISTS idx_dispute_proposals_proposal_type ON public.dispute_proposals(proposal_type);
CREATE INDEX IF NOT EXISTS idx_dispute_proposals_expires_at ON public.dispute_proposals(expires_at);

-- Comments
COMMENT ON TABLE public.dispute_proposals IS 'Settlement proposals for disputes';
COMMENT ON COLUMN public.dispute_proposals.proposal_type IS 'Type: refund, compensation, payment_plan, other';

-- RLS Policies
ALTER TABLE public.dispute_proposals ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.dispute_proposals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Dispute participants can view proposals
CREATE POLICY "Participants can view proposals" ON public.dispute_proposals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.disputes
      WHERE id = dispute_id
      AND (created_by = auth.uid() OR assigned_to = auth.uid() OR escalated_to = auth.uid())
    )
  );

-- Trust agents can create proposals
CREATE POLICY "Trust agents can create proposals" ON public.dispute_proposals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    proposed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type IN ('admin'::user_type, 'trust_agent'::user_type)
      
    )
  );

-- Dispute participants can update proposal responses
CREATE POLICY "Participants can respond to proposals" ON public.dispute_proposals
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.disputes
      WHERE id = dispute_id
      AND (created_by = auth.uid() OR assigned_to = auth.uid() OR escalated_to = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.disputes
      WHERE id = dispute_id
      AND (created_by = auth.uid() OR assigned_to = auth.uid() OR escalated_to = auth.uid())
    )
  );
