-- Migration: Create maintenance_requests table
-- Description: Maintenance request tickets
-- Order: Twentieth table (references profiles, properties, lease_contracts)

CREATE TABLE IF NOT EXISTS public.maintenance_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  property_id uuid,
  contract_id uuid,
  issue_type text NOT NULL,
  description text,
  images text[],
  priority text,
  urgency text,
  scheduled_date timestamp with time zone,
  completed_date timestamp with time zone,
  status text,
  estimated_cost numeric,
  actual_cost numeric,
  rejection_reason text,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT maintenance_requests_pkey PRIMARY KEY (id),
  CONSTRAINT maintenance_requests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT maintenance_requests_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL,
  CONSTRAINT maintenance_requests_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.lease_contracts(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_tenant_id ON public.maintenance_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_property_id ON public.maintenance_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_contract_id ON public.maintenance_requests(contract_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON public.maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_priority ON public.maintenance_requests(priority);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_urgency ON public.maintenance_requests(urgency);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_created_at ON public.maintenance_requests(created_at);

-- Comments
COMMENT ON TABLE public.maintenance_requests IS 'Maintenance request tickets';
COMMENT ON COLUMN public.maintenance_requests.status IS 'Status: pending, scheduled, in_progress, completed, cancelled, rejected';

-- RLS Policies
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.maintenance_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Tenants can view their own maintenance requests
CREATE POLICY "Tenants can view own maintenance requests" ON public.maintenance_requests
  FOR SELECT
  TO authenticated
  USING (tenant_id = auth.uid());

-- Property owners can view maintenance requests for their properties
CREATE POLICY "Owners can view property maintenance requests" ON public.maintenance_requests
  FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

-- Tenants can insert maintenance requests
CREATE POLICY "Tenants can insert maintenance requests" ON public.maintenance_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = auth.uid());

-- Property owners can update maintenance requests for their properties
CREATE POLICY "Owners can update property maintenance requests" ON public.maintenance_requests
  FOR UPDATE
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

-- Updated at trigger
CREATE TRIGGER update_maintenance_requests_updated_at
  BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
