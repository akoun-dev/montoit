-- Phase 5, 6, 7, 8: Tables complètes Mon Toit

-- ========================================
-- Phase 5: DOSSIER LOCATIF
-- ========================================

-- Table des vérifications utilisateurs
CREATE TABLE public.user_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- ONECI Verification
  oneci_status TEXT DEFAULT 'pending' CHECK (oneci_status IN ('pending', 'verified', 'failed')),
  oneci_cni_number TEXT,
  oneci_verified_at TIMESTAMPTZ,
  oneci_data JSONB,
  
  -- CNAM Verification
  cnam_status TEXT DEFAULT 'pending' CHECK (cnam_status IN ('pending', 'verified', 'failed')),
  cnam_employer TEXT,
  cnam_social_security_number TEXT,
  cnam_verified_at TIMESTAMPTZ,
  cnam_data JSONB,
  
  -- Score
  tenant_score INTEGER DEFAULT 0 CHECK (tenant_score >= 0 AND tenant_score <= 100),
  score_updated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des candidatures locatives
CREATE TABLE public.rental_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  applicant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  
  -- Message de candidature
  cover_letter TEXT,
  
  -- Score
  application_score INTEGER DEFAULT 0,
  
  -- Documents (URLs vers storage)
  documents JSONB DEFAULT '[]'::jsonb,
  
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  
  UNIQUE(property_id, applicant_id)
);

-- ========================================
-- Phase 6: MESSAGERIE
-- ========================================

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Lien vers candidature si applicable
  application_id UUID REFERENCES public.rental_applications(id) ON DELETE SET NULL,
  
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================
-- Phase 7: PAIEMENTS MOBILE MONEY
-- ========================================

CREATE TABLE public.payments (
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

CREATE TABLE public.mobile_money_transactions (
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

-- ========================================
-- Phase 8: BAUX ÉLECTRONIQUES
-- ========================================

CREATE TABLE public.leases (
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
  
  -- Signature électronique
  landlord_signed_at TIMESTAMPTZ,
  tenant_signed_at TIMESTAMPTZ,
  ansut_certified_at TIMESTAMPTZ,
  
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_signatures', 'active', 'expired', 'terminated')),
  
  -- Document PDF stocké
  document_url TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================
-- INDEXES
-- ========================================

CREATE INDEX idx_rental_applications_property ON public.rental_applications(property_id);
CREATE INDEX idx_rental_applications_applicant ON public.rental_applications(applicant_id);
CREATE INDEX idx_rental_applications_status ON public.rental_applications(status);

CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX idx_messages_application ON public.messages(application_id);

CREATE INDEX idx_payments_payer ON public.payments(payer_id);
CREATE INDEX idx_payments_receiver ON public.payments(receiver_id);
CREATE INDEX idx_payments_status ON public.payments(status);

CREATE INDEX idx_leases_property ON public.leases(property_id);
CREATE INDEX idx_leases_landlord ON public.leases(landlord_id);
CREATE INDEX idx_leases_tenant ON public.leases(tenant_id);
CREATE INDEX idx_leases_status ON public.leases(status);

-- ========================================
-- RLS POLICIES
-- ========================================

-- user_verifications
ALTER TABLE public.user_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateurs peuvent voir leurs propres vérifications"
  ON public.user_verifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Utilisateurs peuvent créer leurs vérifications"
  ON public.user_verifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilisateurs peuvent mettre à jour leurs vérifications"
  ON public.user_verifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- rental_applications
ALTER TABLE public.rental_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidatures visibles par candidat et propriétaire"
  ON public.rental_applications FOR SELECT
  TO authenticated
  USING (
    auth.uid() = applicant_id 
    OR auth.uid() IN (SELECT owner_id FROM public.properties WHERE id = property_id)
  );

CREATE POLICY "Candidats peuvent créer candidatures"
  ON public.rental_applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Candidats peuvent retirer candidatures"
  ON public.rental_applications FOR UPDATE
  TO authenticated
  USING (auth.uid() = applicant_id);

CREATE POLICY "Propriétaires peuvent approuver/rejeter"
  ON public.rental_applications FOR UPDATE
  TO authenticated
  USING (auth.uid() IN (SELECT owner_id FROM public.properties WHERE id = property_id));

-- messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Messages visibles par expéditeur et destinataire"
  ON public.messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Utilisateurs peuvent envoyer messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Destinataires peuvent marquer comme lu"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id);

-- payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Paiements visibles par payeur et receveur"
  ON public.payments FOR SELECT
  TO authenticated
  USING (auth.uid() = payer_id OR auth.uid() = receiver_id);

CREATE POLICY "Payeurs peuvent créer paiements"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = payer_id);

-- mobile_money_transactions
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

-- leases
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

-- ========================================
-- TRIGGERS
-- ========================================

CREATE TRIGGER update_user_verifications_updated_at
  BEFORE UPDATE ON public.user_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rental_applications_updated_at
  BEFORE UPDATE ON public.rental_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mobile_money_transactions_updated_at
  BEFORE UPDATE ON public.mobile_money_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leases_updated_at
  BEFORE UPDATE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- REALTIME
-- ========================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rental_applications;