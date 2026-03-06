-- Migration: Create lease_contracts table
-- Description: Formal lease contracts with detailed information
-- Order: Sixth table (references properties, leases, profiles, agencies)

CREATE TABLE IF NOT EXISTS public.lease_contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contract_number text NOT NULL UNIQUE,
  reference_number text,
  property_id uuid NOT NULL,
  lease_id uuid,
  owner_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  agency_id uuid,
  monthly_rent numeric NOT NULL,
  deposit_amount numeric,
  charges_amount numeric DEFAULT 0,
  service_charges numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  start_date date NOT NULL,
  end_at date,
  signing_date date,
  effective_date date,
  payment_day integer DEFAULT 1,
  payment_method payment_method DEFAULT 'bank_transfer'::payment_method,
  bank_account_details jsonb DEFAULT '{}'::jsonb,
  duration_months integer,
  renewal_option boolean DEFAULT false,
  renewal_notice_days integer DEFAULT 60,
  termination_notice_days integer DEFAULT 30,
  auto_renewal boolean DEFAULT false,
  custom_clauses text,
  special_conditions text,
  inventory_details jsonb DEFAULT '{}'::jsonb,
  house_rules text,
  status lease_contract_status DEFAULT 'draft'::lease_contract_status,
  owner_signature jsonb DEFAULT '{}'::jsonb,
  tenant_signature jsonb DEFAULT '{}'::jsonb,
  agency_signature jsonb DEFAULT '{}'::jsonb,
  witness_signatures jsonb DEFAULT '[]'::jsonb,
  owner_signed_at timestamp with time zone,
  tenant_signed_at timestamp with time zone,
  agency_signed_at timestamp with time zone,
  fully_signed_at timestamp with time zone,
  document_url text,
  document_hash text,
  document_version integer DEFAULT 1,
  draft_document_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  tags text[] DEFAULT '{}'::text[],
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  terminated_at timestamp with time zone,
  archived_at timestamp with time zone,
  end_date date,
  CONSTRAINT lease_contracts_pkey PRIMARY KEY (id),
  CONSTRAINT lease_contracts_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE,
  CONSTRAINT lease_contracts_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE SET NULL,
  CONSTRAINT lease_contracts_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT lease_contracts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT lease_contracts_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lease_contracts_property_id ON public.lease_contracts(property_id);
CREATE INDEX IF NOT EXISTS idx_lease_contracts_lease_id ON public.lease_contracts(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_contracts_owner_id ON public.lease_contracts(owner_id);
CREATE INDEX IF NOT EXISTS idx_lease_contracts_tenant_id ON public.lease_contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lease_contracts_agency_id ON public.lease_contracts(agency_id);
CREATE INDEX IF NOT EXISTS idx_lease_contracts_contract_number ON public.lease_contracts(contract_number);
CREATE INDEX IF NOT EXISTS idx_lease_contracts_status ON public.lease_contracts(status);
CREATE INDEX IF NOT EXISTS idx_lease_contracts_start_date ON public.lease_contracts(start_date);
CREATE INDEX IF NOT EXISTS idx_lease_contracts_end_at ON public.lease_contracts(end_at);
CREATE INDEX IF NOT EXISTS idx_lease_contracts_end_date ON public.lease_contracts(end_date);

-- Comments
COMMENT ON TABLE public.lease_contracts IS 'Formal lease contracts with detailed information and signatures';
COMMENT ON COLUMN public.lease_contracts.status IS 'Status: draft, pending_signature, active, terminated, cancelled, expired';
COMMENT ON COLUMN public.lease_contracts.payment_method IS 'Payment method: bank_transfer, cash, check, orange_money, mtn_money, moov_money, wave, card';

-- RLS Policies
ALTER TABLE public.lease_contracts ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.lease_contracts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Tenants can view their contracts
CREATE POLICY "Tenants can view own contracts" ON public.lease_contracts
  FOR SELECT
  TO authenticated
  USING (tenant_id = auth.uid());

-- Owners can view their contracts
CREATE POLICY "Owners can view own contracts" ON public.lease_contracts
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Agency users can view their contracts
CREATE POLICY "Agency users can view contracts" ON public.lease_contracts
  FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT id FROM public.agencies WHERE id = auth.uid()
    )
  );

-- Owners can insert contracts
CREATE POLICY "Owners can insert contracts" ON public.lease_contracts
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Owners can update their contracts
CREATE POLICY "Owners can update own contracts" ON public.lease_contracts
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Tenants can sign their contracts
CREATE POLICY "Tenants can sign own contracts" ON public.lease_contracts
  FOR UPDATE
  TO authenticated
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid() AND (tenant_signature IS NULL OR tenant_signature = '{}'::jsonb));

-- Updated at trigger
CREATE TRIGGER update_lease_contracts_updated_at
  BEFORE UPDATE ON public.lease_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
