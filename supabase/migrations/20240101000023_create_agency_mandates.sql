-- Migration: Create agency_mandates table
-- Description: Agency mandates for property management
-- Order: Twenty-third table (references properties, agencies, profiles)

CREATE TABLE IF NOT EXISTS public.agency_mandates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid,
  agency_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  mandate_scope text NOT NULL DEFAULT 'single_property'::text CHECK (mandate_scope = ANY (ARRAY['single_property'::text, 'all_properties'::text])),
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'active'::text, 'expired'::text, 'cancelled'::text, 'suspended'::text])),
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone,
  commission_rate numeric NOT NULL DEFAULT 8 CHECK (commission_rate >= 0::numeric AND commission_rate <= 100::numeric),
  mandate_document_url text,
  signed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  cryptoneo_operation_id text UNIQUE,
  cryptoneo_signature_status text CHECK (cryptoneo_signature_status = ANY (ARRAY['pending'::text, 'owner_signed'::text, 'agency_signed'::text, 'completed'::text, 'failed'::text, 'expired'::text])),
  signed_mandate_url text,
  owner_signed_at timestamp with time zone,
  agency_signed_at timestamp with time zone,
  can_view_properties boolean NOT NULL DEFAULT true,
  can_edit_properties boolean NOT NULL DEFAULT false,
  can_create_properties boolean NOT NULL DEFAULT false,
  can_delete_properties boolean NOT NULL DEFAULT false,
  can_view_applications boolean NOT NULL DEFAULT true,
  can_manage_applications boolean NOT NULL DEFAULT false,
  can_create_leases boolean NOT NULL DEFAULT false,
  can_view_financials boolean NOT NULL DEFAULT false,
  can_manage_maintenance boolean NOT NULL DEFAULT false,
  can_communicate_tenants boolean NOT NULL DEFAULT true,
  can_manage_documents boolean NOT NULL DEFAULT false,
  CONSTRAINT agency_mandates_pkey PRIMARY KEY (id),
  CONSTRAINT agency_mandates_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE,
  CONSTRAINT agency_mandates_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE,
  CONSTRAINT agency_mandates_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agency_mandates_property_id ON public.agency_mandates(property_id);
CREATE INDEX IF NOT EXISTS idx_agency_mandates_agency_id ON public.agency_mandates(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_mandates_owner_id ON public.agency_mandates(owner_id);
CREATE INDEX IF NOT EXISTS idx_agency_mandates_status ON public.agency_mandates(status);
CREATE INDEX IF NOT EXISTS idx_agency_mandates_mandate_scope ON public.agency_mandates(mandate_scope);
CREATE INDEX IF NOT EXISTS idx_agency_mandates_start_date ON public.agency_mandates(start_date);
CREATE INDEX IF NOT EXISTS idx_agency_mandates_end_date ON public.agency_mandates(end_date);

-- Comments
COMMENT ON TABLE public.agency_mandates IS 'Agency mandates for property management';
COMMENT ON COLUMN public.agency_mandates.mandate_scope IS 'Scope: single_property, all_properties';
COMMENT ON COLUMN public.agency_mandates.status IS 'Status: pending, active, expired, cancelled, suspended';

-- RLS Policies
ALTER TABLE public.agency_mandates ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.agency_mandates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Property owners can view their mandates
CREATE POLICY "Owners can view own mandates" ON public.agency_mandates
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Agency users can view their mandates
CREATE POLICY "Agency users can view own mandates" ON public.agency_mandates
  FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT id FROM public.agencies WHERE id = auth.uid()
    )
  );

-- Owners can insert mandates
CREATE POLICY "Owners can insert mandates" ON public.agency_mandates
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Owners can update their mandates
CREATE POLICY "Owners can update own mandates" ON public.agency_mandates
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Updated at trigger
CREATE TRIGGER update_agency_mandates_updated_at
  BEFORE UPDATE ON public.agency_mandates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
