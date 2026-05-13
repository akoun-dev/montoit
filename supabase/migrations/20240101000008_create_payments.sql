-- Migration: Create payments table
-- Description: Payment records
-- Order: Eighth table (references properties, profiles, leases)

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  amount numeric NOT NULL,
  currency text DEFAULT 'XOF'::text,
  payment_type payment_type NOT NULL,
  payment_method payment_method NOT NULL,
  tenant_id uuid NOT NULL,
  property_id uuid,
  lease_id uuid,
  status payment_status DEFAULT 'pending'::payment_status,
  due_date date,
  paid_at timestamp with time zone,
  due_date_reminders jsonb DEFAULT '[]'::jsonb,
  transaction_id text UNIQUE,
  external_reference text,
  processor_response jsonb DEFAULT '{}'::jsonb,
  base_amount numeric,
  fees_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total_amount numeric,
  refund_amount numeric DEFAULT 0,
  refund_reason text,
  refunded_at timestamp with time zone,
  refund_transaction_id text,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  provider text,
  payment_url text,
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT payments_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL,
  CONSTRAINT payments_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_property_id ON public.payments(property_id);
CREATE INDEX IF NOT EXISTS idx_payments_lease_id ON public.payments(lease_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON public.payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON public.payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON public.payments(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON public.payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at);

-- Comments
COMMENT ON TABLE public.payments IS 'Payment records';
COMMENT ON COLUMN public.payments.payment_type IS 'Type: rent, security_deposit, service_charges, fees, reservation, refund';
COMMENT ON COLUMN public.payments.status IS 'Status: pending, completed, failed, overdue, partial, cancelled, refunded';
COMMENT ON COLUMN public.payments.payment_method IS 'Method: bank_transfer, cash, check, card, mobile_money, orange_money, mtn_money, moov_money, wave';

-- RLS Policies
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Tenants can view their payments
CREATE POLICY "Tenants can view own payments" ON public.payments
  FOR SELECT
  TO authenticated
  USING (tenant_id = auth.uid());

-- Property owners can view payments for their properties
CREATE POLICY "Owners can view property payments" ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

-- Service role can insert payments
CREATE POLICY "Service role can insert payments" ON public.payments
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Updated at trigger
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
