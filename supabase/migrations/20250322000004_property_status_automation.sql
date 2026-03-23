-- Ajouter des colonnes pour le suivi du statut des propriétés
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_reason TEXT;

-- Table pour l'historique des changements de statut
CREATE TABLE IF NOT EXISTS property_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  old_status TEXT NOT NULL CHECK (old_status IN ('available', 'rented', 'pending', 'maintenance', 'unavailable', 'inactive')),
  new_status TEXT NOT NULL CHECK (new_status IN ('available', 'rented', 'pending', 'maintenance', 'unavailable', 'inactive')),
  reason TEXT NOT NULL,
  related_contract_id UUID REFERENCES lease_contracts(id) ON DELETE SET NULL,
  related_application_id UUID REFERENCES rental_applications(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by UUID REFERENCES auth.users(id)
);

-- Index pour l'historique
CREATE INDEX IF NOT EXISTS idx_property_status_history_property_id ON property_status_history(property_id);
CREATE INDEX IF NOT EXISTS idx_property_status_history_changed_at ON property_status_history(changed_at DESC);

-- Table pour les statistiques de vues des propriétés
CREATE TABLE IF NOT EXISTS property_view_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  view_date DATE NOT NULL DEFAULT CURRENT_DATE,
  views_count INTEGER NOT NULL DEFAULT 1,
  unique_views INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(property_id, view_date)
);

-- Index pour les statistiques de vues
CREATE INDEX IF NOT EXISTS idx_property_view_stats_property_id ON property_view_stats(property_id);
CREATE INDEX IF NOT EXISTS idx_property_view_stats_view_date ON property_view_stats(view_date DESC);

-- Fonction pour enregistrer une vue
CREATE OR REPLACE FUNCTION record_property_view(property_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO property_view_stats (property_id, view_date, views_count, unique_views)
  VALUES (property_id, CURRENT_DATE, 1, 1)
  ON CONFLICT (property_id, view_date)
  DO UPDATE SET
    views_count = property_view_stats.views_count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger pour incrémenter les vues (via Edge Function ou appel API)
-- Note: Cette fonction peut être appelée quand une propriété est vue

-- Commentaires
COMMENT ON TABLE property_status_history IS 'Historique des changements de statut des propriétés';
COMMENT ON TABLE property_view_stats IS 'Statistiques de vues des propriétés par jour';
COMMENT ON FUNCTION record_property_view IS 'Enregistre une vue de propriété (à appeler via API/Edge)';
