-- Migration: Create property_assignments table
-- Description: Property assignments to agency agents
-- Order: Thirty-fourth table (references properties, agency_agents, agencies, profiles)

CREATE TABLE IF NOT EXISTS public.property_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  property_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  assigned_by uuid,
  assignment_type text DEFAULT 'exclusive'::text,
  status text DEFAULT 'active'::text,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  commission_override numeric,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT property_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT property_assignments_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE,
  CONSTRAINT property_assignments_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agency_agents(id) ON DELETE CASCADE,
  CONSTRAINT property_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT property_assignments_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_property_assignments_property_id ON public.property_assignments(property_id);
CREATE INDEX IF NOT EXISTS idx_property_assignments_agent_id ON public.property_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_property_assignments_agency_id ON public.property_assignments(agency_id);
CREATE INDEX IF NOT EXISTS idx_property_assignments_assigned_by ON public.property_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_property_assignments_status ON public.property_assignments(status);
CREATE INDEX IF NOT EXISTS idx_property_assignments_start_date ON public.property_assignments(start_date);
CREATE INDEX IF NOT EXISTS idx_property_assignments_end_date ON public.property_assignments(end_date);

-- Comments
COMMENT ON TABLE public.property_assignments IS 'Property assignments to agency agents';
COMMENT ON COLUMN public.property_assignments.assignment_type IS 'Type: exclusive, shared';
COMMENT ON COLUMN public.property_assignments.status IS 'Status: active, inactive, expired';

-- RLS Policies
ALTER TABLE public.property_assignments ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.property_assignments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Agency users can view their agency's assignments
CREATE POLICY "Agency users can view own assignments" ON public.property_assignments
  FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT id FROM public.agencies WHERE id = auth.uid()
    )
  );

-- Agents can view their assignments
CREATE POLICY "Agents can view own assignments" ON public.property_assignments
  FOR SELECT
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM public.agency_agents WHERE id = auth.uid()
    )
  );

-- Agency users can insert assignments
CREATE POLICY "Agency users can insert assignments" ON public.property_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id IN (
      SELECT id FROM public.agencies WHERE id = auth.uid()
    )
  );

-- Agency users can update assignments
CREATE POLICY "Agency users can update assignments" ON public.property_assignments
  FOR UPDATE
  TO authenticated
  USING (
    agency_id IN (
      SELECT id FROM public.agencies WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT id FROM public.agencies WHERE id = auth.uid()
    )
  );

-- Updated at trigger
CREATE TRIGGER update_property_assignments_updated_at
  BEFORE UPDATE ON public.property_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
