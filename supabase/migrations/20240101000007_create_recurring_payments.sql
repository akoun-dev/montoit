-- Migration: Create recurring_payments table
-- Description: Recurring payment configurations for rent
-- Order: Seventh table (references lease_contracts, profiles)

CREATE TABLE IF NOT EXISTS public.recurring_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  payment_day integer NOT NULL CHECK (payment_day >= 1 AND payment_day <= 31),
  frequency text NOT NULL CHECK (frequency = ANY (ARRAY['monthly'::text, 'quarterly'::text])),
  provider text NOT NULL CHECK (provider = ANY (ARRAY['orange_money'::text, 'mtn_money'::text, 'moov_money'::text, 'wave'::text])),
  phone_number text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  start_date date NOT NULL,
  end_date date,
  next_payment_date timestamp with time zone NOT NULL,
  last_payment_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT recurring_payments_pkey PRIMARY KEY (id),
  CONSTRAINT recurring_payments_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.lease_contracts(id) ON DELETE CASCADE,
  CONSTRAINT recurring_payments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recurring_payments_contract_id ON public.recurring_payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_recurring_payments_tenant_id ON public.recurring_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recurring_payments_is_active ON public.recurring_payments(is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_payments_next_payment_date ON public.recurring_payments(next_payment_date);
CREATE INDEX IF NOT EXISTS idx_recurring_payments_provider ON public.recurring_payments(provider);

-- Comments
COMMENT ON TABLE public.recurring_payments IS 'Recurring payment configurations for rent';
COMMENT ON COLUMN public.recurring_payments.frequency IS 'Frequency: monthly, quarterly';
COMMENT ON COLUMN public.recurring_payments.provider IS 'Mobile money provider: orange_money, mtn_money, moov_money, wave';

-- RLS Policies
ALTER TABLE public.recurring_payments ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.recurring_payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Tenants can view their recurring payments
CREATE POLICY "Tenants can view own recurring payments" ON public.recurring_payments
  FOR SELECT
  TO authenticated
  USING (tenant_id = auth.uid());

-- Owners can view recurring payments for their contracts
CREATE POLICY "Owners can view contract recurring payments" ON public.recurring_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lease_contracts
      WHERE id = contract_id AND owner_id = auth.uid()
    )
  );

-- Tenants can insert recurring payments
CREATE POLICY "Tenants can insert recurring payments" ON public.recurring_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = auth.uid());

-- Tenants can update their recurring payments
CREATE POLICY "Tenants can update own recurring payments" ON public.recurring_payments
  FOR UPDATE
  TO authenticated
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

-- Updated at trigger
CREATE TRIGGER update_recurring_payments_updated_at
  BEFORE UPDATE ON public.recurring_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
