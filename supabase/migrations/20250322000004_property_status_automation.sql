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

-- ============================================
-- AUTOMATISATION DES CHANGEMENTS DE STATUT
-- ============================================

-- Fonction pour enregistrer l'historique des changements de statut
CREATE OR REPLACE FUNCTION log_property_status_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO property_status_history (
    property_id,
    old_status,
    new_status,
    reason,
    related_contract_id,
    changed_at,
    changed_by
  )
  VALUES (
    NEW.id,
    COALESCE(OLD.status, 'unknown'),
    NEW.status,
    COALESCE(NEW.status_reason, 'Statut mis à jour'),
    NULL,
    NOW(),
    auth.uid()  -- Utiliser l'utilisateur authentifié actuel
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour logger les changements de statut des propriétés
DROP TRIGGER IF EXISTS property_status_change_trigger ON properties;
CREATE TRIGGER property_status_change_trigger
  AFTER UPDATE OF status ON properties
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_property_status_change();

-- ============================================
-- MON-044: Auto statut 'LOUÉ' à activation du bail
-- ============================================

-- Fonction pour mettre le statut de la propriété à 'rented' quand un bail devient actif
CREATE OR REPLACE FUNCTION update_property_status_to_rented()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si le statut passe à 'active' (bail signé et actif)
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    -- Mettre à jour la propriété
    UPDATE properties
    SET
      status = 'rented',
      status_updated_at = NOW(),
      status_reason = 'Bail actif - Contrat #' || NEW.id
    WHERE id = NEW.property_id;

    -- Enregistrer dans l'historique
    INSERT INTO property_status_history (
      property_id,
      old_status,
      new_status,
      reason,
      related_contract_id,
      changed_at
    )
    SELECT
      NEW.property_id,
      status,
      'rented',
      'Bail activé automatiquement',
      NEW.id,
      NOW()
    FROM properties
    WHERE id = NEW.property_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur la table lease_contracts pour le statut 'active'
DROP TRIGGER IF EXISTS lease_signed_update_property_trigger ON lease_contracts;
CREATE TRIGGER lease_signed_update_property_trigger
  AFTER UPDATE OF status ON lease_contracts
  FOR EACH ROW
  WHEN (NEW.status = 'active' AND OLD.status IS DISTINCT FROM 'active')
  EXECUTE FUNCTION update_property_status_to_rented();

-- ============================================
-- MON-045: Auto statut 'DISPONIBLE' à fin/résiliation du bail
-- ============================================

-- Fonction pour remettre le statut de la propriété à 'available' quand un bail se termine
CREATE OR REPLACE FUNCTION update_property_status_to_available()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si le statut passe à 'terminated' ou 'cancelled'
  IF NEW.status IN ('terminated', 'cancelled', 'expired')
     AND (OLD.status IS NULL OR OLD.status NOT IN ('terminated', 'cancelled', 'expired')) THEN

    -- Mettre à jour la propriété
    UPDATE properties
    SET
      status = 'available',
      status_updated_at = NOW(),
      status_reason = 'Bail terminé - Contrat #' || NEW.id
    WHERE id = NEW.property_id;

    -- Enregistrer dans l'historique
    INSERT INTO property_status_history (
      property_id,
      old_status,
      new_status,
      reason,
      related_contract_id,
      changed_at
    )
    SELECT
      NEW.property_id,
      'rented',
      'available',
      'Bail terminé automatiquement - ' || NEW.status,
      NEW.id,
      NOW()
    FROM properties
    WHERE id = NEW.property_id
    AND status = 'rented';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur la table lease_contracts pour les statuts de fin de bail
DROP TRIGGER IF EXISTS lease_terminated_update_property_trigger ON lease_contracts;
CREATE TRIGGER lease_terminated_update_property_trigger
  AFTER UPDATE OF status ON lease_contracts
  FOR EACH ROW
  WHEN (
    NEW.status IN ('terminated', 'cancelled', 'expired')
    AND OLD.status IS DISTINCT FROM NEW.status
    AND OLD.status NOT IN ('terminated', 'cancelled', 'expired')
  )
  EXECUTE FUNCTION update_property_status_to_available();

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON TABLE property_status_history IS 'Historique des changements de statut des propriétés';
COMMENT ON TABLE property_view_stats IS 'Statistiques de vues des propriétés par jour';
COMMENT ON FUNCTION record_property_view IS 'Enregistre une vue de propriété (à appeler via API/Edge)';
COMMENT ON FUNCTION update_property_status_to_rented IS 'Met automatiquement le statut de la propriété à "rented" lors de la signature d''un bail';
COMMENT ON FUNCTION update_property_status_to_available IS 'Remet automatiquement le statut de la propriété à "available" lors de la fin d''un bail';
