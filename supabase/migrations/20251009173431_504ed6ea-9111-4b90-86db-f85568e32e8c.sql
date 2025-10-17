-- Ajouter colonnes estimation travaux (optionnel)
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS work_estimated_cost NUMERIC,
ADD COLUMN IF NOT EXISTS work_estimated_duration TEXT,
ADD COLUMN IF NOT EXISTS work_start_date DATE;

-- Commentaires pour documentation
COMMENT ON COLUMN properties.work_estimated_cost IS 'Coût estimé des travaux en FCFA';
COMMENT ON COLUMN properties.work_estimated_duration IS 'Durée estimée (ex: "2 semaines", "1 mois")';
COMMENT ON COLUMN properties.work_start_date IS 'Date prévue de début des travaux';