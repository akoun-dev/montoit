-- Migration: Create monartisan_job_requests table
-- Description: MonArtisan job requests for maintenance
-- Order: One hundredth table (references monartisan_contractors, maintenance_requests)

CREATE TABLE IF NOT EXISTS public.monartisan_job_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contractor_id uuid,
  maintenance_request_id uuid,
  status text,
  quote_amount numeric,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT monartisan_job_requests_pkey PRIMARY KEY (id),
  CONSTRAINT monartisan_job_requests_contractor_id_fkey FOREIGN KEY (contractor_id) REFERENCES public.monartisan_contractors(id) ON DELETE SET NULL,
  CONSTRAINT monartisan_job_requests_maintenance_request_id_fkey FOREIGN KEY (maintenance_request_id) REFERENCES public.maintenance_requests(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_monartisan_job_requests_contractor_id ON public.monartisan_job_requests(contractor_id);
CREATE INDEX IF NOT EXISTS idx_monartisan_job_requests_maintenance_request_id ON public.monartisan_job_requests(maintenance_request_id);
CREATE INDEX IF NOT EXISTS idx_monartisan_job_requests_status ON public.monartisan_job_requests(status);

-- Comments
COMMENT ON TABLE public.monartisan_job_requests IS 'MonArtisan job requests for maintenance';

-- RLS Policies
ALTER TABLE public.monartisan_job_requests ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.monartisan_job_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Property owners can view job requests for their maintenance requests
CREATE POLICY "Owners can view job requests" ON public.monartisan_job_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests
      WHERE id = maintenance_request_id AND tenant_id = auth.uid()
    )
  );

-- Tenants can view job requests for their maintenance requests
CREATE POLICY "Tenants can view job requests" ON public.monartisan_job_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests
      WHERE id = maintenance_request_id AND tenant_id = auth.uid()
    )
  );
