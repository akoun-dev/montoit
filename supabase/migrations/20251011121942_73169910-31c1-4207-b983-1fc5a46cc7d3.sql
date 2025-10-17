-- Ajouter le statut 'en_negociation' aux propriétés
-- Garder tous les statuts existants pour éviter les violations
ALTER TABLE properties 
DROP CONSTRAINT IF EXISTS properties_status_check;

ALTER TABLE properties 
ADD CONSTRAINT properties_status_check 
CHECK (status IN ('disponible', 'loué', 'loue', 'en_maintenance', 'en_negociation', 'pending', 'rejected', 'approved'));

-- Ajouter un commentaire pour la documentation
COMMENT ON COLUMN properties.status IS 'Statut de la propriété: disponible, loué, en_maintenance, en_negociation, pending, rejected, approved';