-- Migration: Create rent_payments table
-- Description: Rent payment records linked to transactions
-- Order: Seventy-second table (references lease_contracts, recurring_payments, transactions, payments)

CREATE TABLE IF NOT EXISTS public.rent_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lease_id uuid NOT NULL,
  recurring_payment_id uuid,
  transaction_id text,
  payment_id uuid,
  amount numeric NOT NULL,
  payment_date timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text])),
  receipt_url text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rent_payments_pkey PRIMARY KEY (id),
  CONSTRAINT rent_payments_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES public.lease_contracts(id) ON DELETE CASCADE,
  CONSTRAINT rent_payments_recurring_payment_id_fkey FOREIGN KEY (recurring_payment_id) REFERENCES public.recurring_payments(id) ON DELETE SET NULL,
  CONSTRAINT rent_payments_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(transaction_id) ON DELETE SET NULL,
  CONSTRAINT rent_payments_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rent_payments_lease_id ON public.rent_payments(lease_id);
CREATE INDEX IF NOT EXISTS idx_rent_payments_recurring_payment_id ON public.rent_payments(recurring_payment_id);
CREATE INDEX IF NOT EXISTS idx_rent_payments_transaction_id ON public.rent_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_rent_payments_payment_id ON public.rent_payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_rent_payments_status ON public.rent_payments(status);
CREATE INDEX IF NOT EXISTS idx_rent_payments_payment_date ON public.rent_payments(payment_date);

-- Comments
COMMENT ON TABLE public.rent_payments IS 'Rent payment records linked to transactions';
COMMENT ON COLUMN public.rent_payments.status IS 'Status: pending, paid, failed';

-- RLS Policies
ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.rent_payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Tenants can view their rent payments
CREATE POLICY "Tenants can view own rent payments" ON public.rent_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lease_contracts
      WHERE id = lease_id AND tenant_id = auth.uid()
    )
  );

-- Property owners can view rent payments for their properties
CREATE POLICY "Owners can view contract rent payments" ON public.rent_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lease_contracts
      WHERE id = lease_id AND owner_id = auth.uid()
    )
  );

-- Service role can insert rent payments
CREATE POLICY "Service role can insert rent payments" ON public.rent_payments
  FOR INSERT
  TO service_role
  WITH CHECK (true);
