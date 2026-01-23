-- Table pour les paiements récurrents automatiques
CREATE TABLE IF NOT EXISTS public.recurring_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.lease_contracts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  payment_day INTEGER NOT NULL CHECK (payment_day BETWEEN 1 AND 31),
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly')),
  provider TEXT NOT NULL CHECK (provider IN ('orange_money', 'mtn_money', 'moov_money', 'wave')),
  phone_number TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date DATE NOT NULL,
  end_date DATE,
  next_payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  last_payment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index pour la recherche des paiements dus
CREATE INDEX IF NOT EXISTS idx_recurring_payments_next_payment ON public.recurring_payments(next_payment_date)
  WHERE is_active = true;

-- Index pour la recherche par tenant
CREATE INDEX IF NOT EXISTS idx_recurring_payments_tenant ON public.recurring_payments(tenant_id)
  WHERE is_active = true;

-- Index pour la recherche par contract
CREATE INDEX IF NOT EXISTS idx_recurring_payments_contract ON public.recurring_payments(contract_id)
  WHERE is_active = true;

-- RLS (Row Level Security)
ALTER TABLE public.recurring_payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own recurring payments" ON public.recurring_payments;
DROP POLICY IF EXISTS "Users can create own recurring payments" ON public.recurring_payments;
DROP POLICY IF EXISTS "Users can update own recurring payments" ON public.recurring_payments;
DROP POLICY IF EXISTS "Users can delete own recurring payments" ON public.recurring_payments;

-- Les utilisateurs peuvent voir leurs propres paiements récurrents
CREATE POLICY "Users can view own recurring payments"
  ON public.recurring_payments
  FOR SELECT
  USING (tenant_id = auth.uid());

-- Les utilisateurs peuvent créer leurs propres paiements récurrents
CREATE POLICY "Users can create own recurring payments"
  ON public.recurring_payments
  FOR INSERT
  WITH CHECK (tenant_id = auth.uid());

-- Les utilisateurs peuvent mettre à jour leurs propres paiements récurrents
CREATE POLICY "Users can update own recurring payments"
  ON public.recurring_payments
  FOR UPDATE
  USING (tenant_id = auth.uid());

-- Les utilisateurs peuvent supprimer leurs propres paiements récurrents
CREATE POLICY "Users can delete own recurring payments"
  ON public.recurring_payments
  FOR DELETE
  USING (tenant_id = auth.uid());

-- Commentaire
COMMENT ON TABLE public.recurring_payments IS 'Paiements récurrents automatiques pour les loyers';
