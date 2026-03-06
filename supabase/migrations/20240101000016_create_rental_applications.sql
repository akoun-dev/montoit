-- Migration: Create rental_applications table
-- Description: Rental property applications from tenants
-- Order: Sixteenth table (references properties, profiles)

CREATE TABLE IF NOT EXISTS public.rental_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  status application_status DEFAULT 'pending'::application_status,
  application_message text,
  proposed_rent numeric,
  income_proof jsonb DEFAULT '[]'::jsonb,
  guarantor_id uuid,
  documents jsonb DEFAULT '[]'::jsonb,
  background_check_status text DEFAULT 'pending'::text,
  credit_score integer,
  landlord_notes text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  applied_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  CONSTRAINT rental_applications_pkey PRIMARY KEY (id),
  CONSTRAINT rental_applications_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE,
  CONSTRAINT rental_applications_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT rental_applications_guarantor_id_fkey FOREIGN KEY (guarantor_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT rental_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rental_applications_property_id ON public.rental_applications(property_id);
CREATE INDEX IF NOT EXISTS idx_rental_applications_tenant_id ON public.rental_applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rental_applications_status ON public.rental_applications(status);
CREATE INDEX IF NOT EXISTS idx_rental_applications_guarantor_id ON public.rental_applications(guarantor_id);
CREATE INDEX IF NOT EXISTS idx_rental_applications_reviewed_by ON public.rental_applications(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_rental_applications_applied_at ON public.rental_applications(applied_at);

-- Comments
COMMENT ON TABLE public.rental_applications IS 'Rental property applications from tenants';
COMMENT ON COLUMN public.rental_applications.status IS 'Status: pending, in_progress, accepted, rejected, cancelled';

-- RLS Policies
ALTER TABLE public.rental_applications ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.rental_applications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Tenants can view their own applications
CREATE POLICY "Tenants can view own applications" ON public.rental_applications
  FOR SELECT
  TO authenticated
  USING (tenant_id = auth.uid());

-- Property owners can view applications for their properties
CREATE POLICY "Owners can view property applications" ON public.rental_applications
  FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

-- Tenants can insert applications
CREATE POLICY "Tenants can insert applications" ON public.rental_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = auth.uid());

-- Property owners can update applications for their properties
CREATE POLICY "Owners can update property applications" ON public.rental_applications
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
CREATE TRIGGER update_rental_applications_updated_at
  BEFORE UPDATE ON public.rental_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
