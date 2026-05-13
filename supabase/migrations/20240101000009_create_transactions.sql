-- Migration: Create transactions table
-- Description: Mobile money transactions
-- Order: Ninth table (references lease_contracts, profiles, properties)

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  transaction_id text NOT NULL UNIQUE,
  amount numeric NOT NULL,
  phone_number text NOT NULL,
  operator text NOT NULL CHECK (operator = ANY (ARRAY['OM'::text, 'MTN'::text, 'MOOV'::text, 'WAVE'::text, 'orange_money'::text, 'mtn_money'::text, 'moov_money'::text, 'wave'::text])),
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'success'::text, 'failed'::text, 'PENDING'::text, 'SUCCESS'::text, 'FAILED'::text])),
  description text,
  type text NOT NULL CHECK (type = ANY (ARRAY['rental_payment'::text, 'deposit'::text, 'maintenance'::text, 'other'::text, 'rent'::text, 'security_deposit'::text, 'service_charges'::text])),
  lease_id uuid,
  tenant_id uuid,
  property_owner_id uuid,
  property_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES public.lease_contracts(id) ON DELETE SET NULL,
  CONSTRAINT transactions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT transactions_property_owner_id_fkey FOREIGN KEY (property_owner_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT transactions_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_id ON public.transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_lease_id ON public.transactions(lease_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_id ON public.transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_property_owner_id ON public.transactions(property_owner_id);
CREATE INDEX IF NOT EXISTS idx_transactions_property_id ON public.transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_phone_number ON public.transactions(phone_number);
CREATE INDEX IF NOT EXISTS idx_transactions_operator ON public.transactions(operator);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);

-- Comments
COMMENT ON TABLE public.transactions IS 'Mobile money transactions';
COMMENT ON COLUMN public.transactions.operator IS 'Mobile operator: OM, MTN, MOOV, WAVE, orange_money, mtn_money, moov_money, wave';
COMMENT ON COLUMN public.transactions.status IS 'Status: pending, success, failed, PENDING, SUCCESS, FAILED';
COMMENT ON COLUMN public.transactions.type IS 'Type: rental_payment, deposit, maintenance, other, loyer, depot_garantie, charges';

-- RLS Policies
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Tenants can view their transactions
CREATE POLICY "Tenants can view own transactions" ON public.transactions
  FOR SELECT
  TO authenticated
  USING (tenant_id = auth.uid());

-- Property owners can view transactions for their properties
CREATE POLICY "Owners can view property transactions" ON public.transactions
  FOR SELECT
  TO authenticated
  USING (
    property_owner_id = auth.uid()
    OR property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

-- Updated at trigger
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
