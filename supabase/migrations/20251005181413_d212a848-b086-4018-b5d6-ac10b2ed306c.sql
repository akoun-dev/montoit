-- Optimisation des performances : Index pour les requêtes fréquentes

-- Index pour filtrer les baux par statut de certification
CREATE INDEX IF NOT EXISTS idx_leases_certification_status 
ON leases(certification_status);

-- Index pour les requêtes par property_id
CREATE INDEX IF NOT EXISTS idx_leases_property_id 
ON leases(property_id);

-- Index pour les requêtes de baux certifiés (utilisé par le filtre ANSUT)
CREATE INDEX IF NOT EXISTS idx_leases_certified_properties 
ON leases(property_id, certification_status) 
WHERE certification_status = 'certified';

-- Index pour les notifications non lues par utilisateur
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, is_read, created_at DESC)
WHERE is_read = false;

-- Index pour l'historique de certification par bail
CREATE INDEX IF NOT EXISTS idx_lease_certification_history_lease 
ON lease_certification_history(lease_id, created_at DESC);

-- Index pour les logs d'audit par admin et date
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_date 
ON admin_audit_logs(admin_id, created_at DESC);

-- Index pour les documents de bail
CREATE INDEX IF NOT EXISTS idx_lease_documents_lease 
ON lease_documents(lease_id, created_at DESC);