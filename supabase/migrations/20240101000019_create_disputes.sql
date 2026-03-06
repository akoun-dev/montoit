-- Migration: Create disputes table
-- Description: Dispute records for mediation
-- Order: Nineteenth table (references lease_contracts, profiles)

CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contract_id uuid,
  type text NOT NULL CHECK (type = ANY (ARRAY['deposit'::text, 'damage'::text, 'rent'::text, 'noise'::text, 'other'::text])),
  status text NOT NULL DEFAULT 'assigned'::text CHECK (status = ANY (ARRAY['assigned'::text, 'under_mediation'::text, 'awaiting_response'::text, 'resolved'::text, 'escalated'::text])),
  priority text NOT NULL DEFAULT 'medium'::text CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])),
  title text NOT NULL,
  description text NOT NULL,
  created_by uuid NOT NULL,
  assigned_to uuid,
  mediation_stage text CHECK (mediation_stage = ANY (ARRAY['reception'::text, 'analysis'::text, 'negotiation'::text, 'proposal'::text, 'resolution'::text])),
  resolution_notes text,
  resolved_at timestamp with time zone,
  escalated_at timestamp with time zone,
  escalated_to uuid,
  escalation_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT disputes_pkey PRIMARY KEY (id),
  CONSTRAINT disputes_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.lease_contracts(id) ON DELETE SET NULL,
  CONSTRAINT disputes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT disputes_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT disputes_escalated_to_fkey FOREIGN KEY (escalated_to) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_disputes_contract_id ON public.disputes(contract_id);
CREATE INDEX IF NOT EXISTS idx_disputes_type ON public.disputes(type);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_priority ON public.disputes(priority);
CREATE INDEX IF NOT EXISTS idx_disputes_created_by ON public.disputes(created_by);
CREATE INDEX IF NOT EXISTS idx_disputes_assigned_to ON public.disputes(assigned_to);
CREATE INDEX IF NOT EXISTS idx_disputes_escalated_to ON public.disputes(escalated_to);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON public.disputes(created_at);

-- Comments
COMMENT ON TABLE public.disputes IS 'Dispute records for mediation';
COMMENT ON COLUMN public.disputes.type IS 'Type: deposit, damage, rent, noise, other';
COMMENT ON COLUMN public.disputes.status IS 'Status: assigned, under_mediation, awaiting_response, resolved, escalated';
COMMENT ON COLUMN public.disputes.priority IS 'Priority: low, medium, high';

-- RLS Policies
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.disputes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view disputes they created or are assigned to
CREATE POLICY "Users can view related disputes" ON public.disputes
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR escalated_to = auth.uid()
  );

-- Trust agents and admins can view all disputes
CREATE POLICY "Trust agents and admins can view all disputes" ON public.disputes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type IN ('admin'::user_type, 'trust_agent'::user_type)
      
    )
  );

-- Users can create disputes
CREATE POLICY "Users can create disputes" ON public.disputes
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Updated at trigger
CREATE TRIGGER update_disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
