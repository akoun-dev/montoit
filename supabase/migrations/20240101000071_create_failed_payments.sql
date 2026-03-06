-- Migration: Create failed_payments table
-- Description: Failed payment tracking
-- Order: Seventy-first table (references recurring_payments, payments)

CREATE TABLE IF NOT EXISTS public.failed_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recurring_payment_id uuid,
  payment_id uuid,
  error text NOT NULL,
  attempted_at timestamp with time zone NOT NULL DEFAULT now(),
  retry_count integer DEFAULT 1,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT failed_payments_pkey PRIMARY KEY (id),
  CONSTRAINT failed_payments_recurring_payment_id_fkey FOREIGN KEY (recurring_payment_id) REFERENCES public.recurring_payments(id) ON DELETE SET NULL,
  CONSTRAINT failed_payments_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_failed_payments_recurring_payment_id ON public.failed_payments(recurring_payment_id);
CREATE INDEX IF NOT EXISTS idx_failed_payments_payment_id ON public.failed_payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_failed_payments_attempted_at ON public.failed_payments(attempted_at);

-- Comments
COMMENT ON TABLE public.failed_payments IS 'Failed payment tracking';

-- RLS Policies
ALTER TABLE public.failed_payments ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.failed_payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own failed payments
CREATE POLICY "Users can view own failed payments" ON public.failed_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.payments
      WHERE id = payment_id AND tenant_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.recurring_payments
      WHERE id = recurring_payment_id AND tenant_id = auth.uid()
    )
  );

-- No insert/update - failed payments are system-generated
