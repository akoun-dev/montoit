-- Migration: Create mobile_money_transactions table
-- Description: Mobile money transaction details
-- Order: Seventieth table (references payments)

CREATE TABLE IF NOT EXISTS public.mobile_money_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL,
  provider text NOT NULL,
  phone_number text NOT NULL,
  country_code text DEFAULT '225'::text,
  transaction_id text NOT NULL UNIQUE,
  external_transaction_id text,
  otp_required boolean DEFAULT false,
  otp_verified boolean DEFAULT false,
  otp_expires_at timestamp with time zone,
  provider_status text DEFAULT 'pending'::text,
  initiated_at timestamp with time zone,
  confirmed_at timestamp with time zone,
  failed_at timestamp with time zone,
  response_data jsonb DEFAULT '{}'::jsonb,
  callback_data jsonb DEFAULT '{}'::jsonb,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  next_retry_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mobile_money_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT mobile_money_transactions_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mobile_money_transactions_payment_id ON public.mobile_money_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_mobile_money_transactions_provider ON public.mobile_money_transactions(provider);
CREATE INDEX IF NOT EXISTS idx_mobile_money_transactions_phone_number ON public.mobile_money_transactions(phone_number);
CREATE INDEX IF NOT EXISTS idx_mobile_money_transactions_transaction_id ON public.mobile_money_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_mobile_money_transactions_provider_status ON public.mobile_money_transactions(provider_status);
CREATE INDEX IF NOT EXISTS idx_mobile_money_transactions_otp_expires_at ON public.mobile_money_transactions(otp_expires_at);

-- Comments
COMMENT ON TABLE public.mobile_money_transactions IS 'Mobile money transaction details';

-- RLS Policies
ALTER TABLE public.mobile_money_transactions ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.mobile_money_transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own mobile money transactions via payments
CREATE POLICY "Users can view own transactions" ON public.mobile_money_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.payments
      WHERE id = payment_id AND tenant_id = auth.uid()
    )
  );

-- Updated at trigger
CREATE TRIGGER update_mobile_money_transactions_updated_at
  BEFORE UPDATE ON public.mobile_money_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
