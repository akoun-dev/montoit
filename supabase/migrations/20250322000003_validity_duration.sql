-- Table pour la gestion des durées de validité des vérifications
CREATE TABLE IF NOT EXISTS verification_validity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL CHECK (verification_type IN ('oneci', 'cnam', 'facial', 'tenant_dossier', 'owner_certification', 'agency_certification')),
  verification_id TEXT,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expiring_soon', 'expired', 'revoked')),
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  expiry_notification_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour le suivi des expirations
CREATE INDEX IF NOT EXISTS idx_verification_validity_user_id ON verification_validity(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_validity_status ON verification_validity(status);
CREATE INDEX IF NOT EXISTS idx_verification_validity_valid_until ON verification_validity(valid_until);
CREATE INDEX IF NOT EXISTS idx_verification_validity_expiring ON verification_validity(status, valid_until) WHERE status IN ('active', 'expiring_soon');

-- Configuration des durées de validité par type
CREATE TABLE IF NOT EXISTS verification_validity_config (
  verification_type TEXT PRIMARY KEY,
  validity_duration_months INTEGER NOT NULL,
  reminder_days_before INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insérer les configurations par défaut
INSERT INTO verification_validity_config (verification_type, validity_duration_months, reminder_days_before) VALUES
  ('oneci', 24, 30),
  ('cnam', 12, 30),
  ('facial', 6, 15),
  ('tenant_dossier', 12, 30),
  ('owner_certification', 24, 30),
  ('agency_certification', 24, 30)
ON CONFLICT (verification_type) DO NOTHING;

-- Fonction pour mettre à jour le statut des validités expirées
CREATE OR REPLACE FUNCTION update_expired_verifications()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour le statut des validités expirées
  UPDATE verification_validity
  SET
    status = 'expired',
    updated_at = NOW()
  WHERE valid_until <= NOW()
    AND status IN ('active', 'expiring_soon');

  -- Mettre à jour le statut des validités qui expirent bientôt
  UPDATE verification_validity
  SET
    status = 'expiring_soon',
    updated_at = NOW()
  WHERE valid_until <= NOW() + INTERVAL '30 days'
    AND valid_until > NOW()
    AND status = 'active';

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour exécuter périodiquement (via pg_cron ou appel manuel)
CREATE TRIGGER trigger_update_expired_verifications
  AFTER INSERT ON verification_validity
  FOR EACH ROW
  EXECUTE FUNCTION update_expired_verifications();

-- Table pour les demandes de documents complémentaires
CREATE TABLE IF NOT EXISTS additional_document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES verification_applications(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  documents_requested JSONB NOT NULL DEFAULT '{}', -- Format: [{type: "id_card", description: "...", required: true}]
  deadline TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour les demandes de documents
CREATE INDEX IF NOT EXISTS idx_additional_document_requests_application_id ON additional_document_requests(application_id);
CREATE INDEX IF NOT EXISTS idx_additional_document_requests_status ON additional_document_requests(status);
CREATE INDEX IF NOT EXISTS idx_additional_document_requests_deadline ON additional_document_requests(deadline);

-- Table pour le suivi des documents soumis en réponse
CREATE TABLE IF NOT EXISTS additional_document_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES additional_document_requests(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  verification_notes TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ
);

-- Index pour les soumissions
CREATE INDEX IF NOT EXISTS idx_additional_document_submissions_request_id ON additional_document_submissions(request_id);
CREATE INDEX IF NOT EXISTS idx_additional_document_submissions_status ON additional_document_submissions(verification_status);

-- Commentaires
COMMENT ON TABLE verification_validity IS 'Durées de validité des vérifications';
COMMENT ON TABLE verification_validity_config IS 'Configuration des durées de validité par type';
COMMENT ON TABLE additional_document_requests IS 'Demandes de documents complémentaires pour les dossiers';
COMMENT ON TABLE additional_document_submissions IS 'Documents soumis en réponse aux demandes';
