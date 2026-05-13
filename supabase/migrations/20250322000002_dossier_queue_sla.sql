-- Ajouter des colonnes SLA à verification_applications
ALTER TABLE verification_applications
  ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_priority TEXT CHECK (sla_priority IN ('low', 'normal', 'high', 'urgent')),
  ADD COLUMN IF NOT EXISTS sla_status TEXT CHECK (sla_status IN ('on_track', 'at_risk', 'overdue')),
  ADD COLUMN IF NOT EXISTS queue_position INTEGER,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_review_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution_time_hours INTEGER;

-- Index pour le suivi SLA
CREATE INDEX IF NOT EXISTS idx_verification_applications_sla_status ON verification_applications(sla_status) WHERE sla_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_verification_applications_sla_deadline ON verification_applications(sla_deadline) WHERE sla_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_verification_applications_queue_position ON verification_applications(queue_position) WHERE queue_position IS NOT NULL;

-- Table pour l'historique des changements SLA
CREATE TABLE IF NOT EXISTS verification_sla_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES verification_applications(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('submitted', 'assigned', 'in_review', 'more_info', 'approved', 'rejected')),
  previous_status TEXT,
  new_status TEXT,
  sla_deadline TIMESTAMPTZ,
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Index pour l'historique
CREATE INDEX IF NOT EXISTS idx_verification_sla_history_application_id ON verification_sla_history(application_id);
CREATE INDEX IF NOT EXISTS idx_verification_sla_history_timestamp ON verification_sla_history(event_timestamp DESC);

-- Table pour les statistiques SLA
CREATE TABLE IF NOT EXISTS verification_sla_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  dossier_type TEXT NOT NULL CHECK (dossier_type IN ('tenant', 'owner', 'agency')),
  total_submitted INTEGER NOT NULL DEFAULT 0,
  total_processed INTEGER NOT NULL DEFAULT 0,
  total_within_sla INTEGER NOT NULL DEFAULT 0,
  total_overdue INTEGER NOT NULL DEFAULT 0,
  avg_resolution_time_hours NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(date, dossier_type)
);

-- Index pour les statistiques
CREATE INDEX IF NOT EXISTS idx_verification_sla_stats_date ON verification_sla_stats(date DESC);

-- Commentaires
COMMENT ON COLUMN verification_applications.sla_deadline IS 'Date limite pour traiter le dossier selon SLA';
COMMENT ON COLUMN verification_applications.sla_priority IS 'Priorité SLA du dossier';
COMMENT ON COLUMN verification_applications.sla_status IS 'Statut SLA: on_track, at_risk, overdue';
COMMENT ON COLUMN verification_applications.queue_position IS 'Position dans la file d''attente';
COMMENT ON COLUMN verification_applications.resolution_time_hours IS 'Temps de résolution en heures';
