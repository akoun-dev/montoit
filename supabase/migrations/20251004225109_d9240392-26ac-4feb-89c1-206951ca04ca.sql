-- Tables restantes pour Mon Toit

-- ========================================
-- PAIEMENTS MOBILE MONEY
-- ========================================

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  
  amount DECIMAL(12, 2) NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('rent', 'deposit', 'charges')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('orange_money', 'mtn_money', 'wave')),
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  
  transaction_id TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.mobile_money_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE NOT NULL,
  
  provider TEXT NOT NULL CHECK (provider IN ('orange_money', 'mtn_money', 'wave')),
  phone_number TEXT NOT NULL,
  
  transaction_ref TEXT UNIQUE,
  
  amount DECIMAL(12, 2) NOT NULL,
  fees DECIMAL(12, 2) DEFAULT 0,
  
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'pending', 'success', 'failed')),
  
  provider_response JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_payer ON public.payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_receiver ON public.payments(receiver_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Paiements visibles par payeur et receveur') THEN
    ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Paiements visibles par payeur et receveur"
      ON public.payments FOR SELECT
      TO authenticated
      USING (auth.uid() = payer_id OR auth.uid() = receiver_id);

    CREATE POLICY "Payeurs peuvent créer paiements"
      ON public.payments FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = payer_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mobile_money_transactions') THEN
    ALTER TABLE public.mobile_money_transactions ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Transactions visibles via paiements"
      ON public.mobile_money_transactions FOR SELECT
      TO authenticated
      USING (
        payment_id IN (
          SELECT id FROM public.payments 
          WHERE payer_id = auth.uid() OR receiver_id = auth.uid()
        )
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  landlord_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  lease_type TEXT NOT NULL CHECK (lease_type IN ('residential', 'furnished', 'commercial', 'seasonal', 'student', 'option_to_buy', 'professional', 'mixed')),
  
  monthly_rent DECIMAL(12, 2) NOT NULL,
  deposit_amount DECIMAL(12, 2),
  charges_amount DECIMAL(12, 2),
  
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  landlord_signed_at TIMESTAMPTZ,
  tenant_signed_at TIMESTAMPTZ,
  ansut_certified_at TIMESTAMPTZ,
  
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_signatures', 'active', 'expired', 'terminated')),
  
  document_url TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leases_property ON public.leases(property_id);
CREATE INDEX IF NOT EXISTS idx_leases_landlord ON public.leases(landlord_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant ON public.leases(tenant_id);

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leases') THEN
    ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Baux visibles par parties"
      ON public.leases FOR SELECT
      TO authenticated
      USING (auth.uid() = landlord_id OR auth.uid() = tenant_id);

    CREATE POLICY "Propriétaires peuvent créer baux"
      ON public.leases FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = landlord_id);

    CREATE POLICY "Parties peuvent signer baux"
      ON public.leases FOR UPDATE
      TO authenticated
      USING (auth.uid() = landlord_id OR auth.uid() = tenant_id);
  END IF;
END $$;