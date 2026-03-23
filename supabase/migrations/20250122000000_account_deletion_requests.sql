-- Table pour les demandes de suppression de compte
CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  reason TEXT,
  feedback TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID
);

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_account_deletion_user_id ON account_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_account_deletion_status ON account_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_account_deletion_requested_at ON account_deletion_requests(requested_at);

-- Commentaires
COMMENT ON TABLE account_deletion_requests IS 'Demandes de suppression de compte utilisateur (RGPD)';
COMMENT ON COLUMN account_deletion_requests.reason IS 'Raison de la suppression de compte';
COMMENT ON COLUMN account_deletion_requests.feedback IS 'Feedback utilisateur optionnel';
COMMENT ON COLUMN account_deletion_requests.status IS 'Statut: pending, processing, completed, cancelled';
COMMENT ON COLUMN account_deletion_requests.processed_at IS 'Date de traitement de la demande';
COMMENT ON COLUMN account_deletion_requests.processed_by IS 'ID de l''administrateur qui a traité la demande';
