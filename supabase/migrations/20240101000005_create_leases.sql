-- Migration: Create leases table
-- Description: Lease agreements
-- Order: Fifth table (references properties, profiles)

CREATE TABLE IF NOT EXISTS public.leases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  landlord_id uuid NOT NULL,
  lease_type lease_type NOT NULL DEFAULT 'long_term'::lease_type,
  status lease_status DEFAULT 'draft'::lease_status,
  start_date date NOT NULL,
  end_at date,
  signed_at timestamp with time zone,
  rent_amount numeric NOT NULL,
  deposit_amount numeric,
  rent_payment_day integer DEFAULT 1,
  charges_amount numeric,
  late_fee_percent numeric DEFAULT 5.00,
  terms text,
  special_conditions text,
  house_rules text,
  landlord_signature jsonb DEFAULT '{}'::jsonb,
  tenant_signature jsonb DEFAULT '{}'::jsonb,
  witness_signatures jsonb DEFAULT '[]'::jsonb,
  contract_url text,
  contract_hash text,
  auto_renew boolean DEFAULT false,
  renewal_notice_days integer DEFAULT 60,
  termination_notice_days integer DEFAULT 30,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  terminated_at timestamp with time zone,
  last_rent_payment date,
  CONSTRAINT leases_pkey PRIMARY KEY (id),
  CONSTRAINT leases_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE,
  CONSTRAINT leases_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT leases_landlord_id_fkey FOREIGN KEY (landlord_id) REFERENCES public.profiles(id) ON DELETE RESTRICT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leases_property_id ON public.leases(property_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant_id ON public.leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_landlord_id ON public.leases(landlord_id);
CREATE INDEX IF NOT EXISTS idx_leases_status ON public.leases(status);
CREATE INDEX IF NOT EXISTS idx_leases_lease_type ON public.leases(lease_type);
CREATE INDEX IF NOT EXISTS idx_leases_start_date ON public.leases(start_date);
CREATE INDEX IF NOT EXISTS idx_leases_end_at ON public.leases(end_at);

-- Comments
COMMENT ON TABLE public.leases IS 'Lease agreements between tenants and landlords';
COMMENT ON COLUMN public.leases.lease_type IS 'Type: long_term, short_term, seasonal, furnished, commercial';
COMMENT ON COLUMN public.leases.status IS 'Status: draft, pending, active, terminated, cancelled, expired';

-- RLS Policies
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.leases
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Tenants can view their leases
CREATE POLICY "Tenants can view own leases" ON public.leases
  FOR SELECT
  TO authenticated
  USING (tenant_id = auth.uid());

-- Landlords can view their leases
CREATE POLICY "Landlords can view own leases" ON public.leases
  FOR SELECT
  TO authenticated
  USING (landlord_id = auth.uid());

-- Tenants can insert leases
CREATE POLICY "Tenants can insert leases" ON public.leases
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = auth.uid());

-- Landlords can update leases for their properties
CREATE POLICY "Landlords can update leases" ON public.leases
  FOR UPDATE
  TO authenticated
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

-- Updated at trigger
CREATE TRIGGER update_leases_updated_at
  BEFORE UPDATE ON public.leases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
