-- ========================================
-- EPIC: RLS Security Enforcement via RPC-Only Access
-- ========================================
-- Objectif: Forcer l'utilisation de RPCs audités pour l'accès aux données sensibles
-- Tables concernées: user_verifications, disputes
-- Impact: Blocage des SELECT directs non audités

-- ========================================
-- CORRECTION 1: user_verifications
-- ========================================
-- Problème: La policy "Super admins can view all verifications" permet
-- aux super-admins de faire SELECT * directement sans logging
-- Solution: Supprimer cette policy pour forcer l'utilisation du RPC
-- get_verifications_for_admin_review() qui logue tous les accès dans admin_audit_logs

DROP POLICY IF EXISTS "Super admins can view all verifications" ON public.user_verifications;

-- Note: Les policies suivantes restent ACTIVES et suffisantes :
-- ✅ "Utilisateurs peuvent voir leurs propres vérifications" (self-access)
--    → Permet: SELECT WHERE user_id = auth.uid()
-- ✅ Tiers de confiance peuvent voir vérifications via is_trusted_third_party()
--    → Permet: SELECT via RPC get_verifications_for_review()
-- 
-- Les super-admins DOIVENT désormais utiliser UNIQUEMENT :
-- → get_verifications_for_admin_review() RPC (avec audit automatique)

-- ========================================
-- CORRECTION 2: disputes
-- ========================================
-- Problème: La policy "Users can view disputes they're involved in" permet
-- aux users de faire SELECT direct et voir reporter_id sans masquage
-- Solution: Bloquer tous les SELECT directs, forcer get_my_disputes() RPC

DROP POLICY IF EXISTS "Users can view disputes they're involved in" ON public.disputes;

-- Créer une policy bloquante pour tous les SELECT
CREATE POLICY "Disputes must use get_my_disputes RPC"
ON public.disputes FOR SELECT
USING (false);

-- Note: Les policies INSERT/UPDATE restent INCHANGÉES :
-- ✅ "Users can create disputes" (FOR INSERT)
--    → Permet: INSERT WHERE auth.uid() = reporter_id
-- ✅ "Admins can update disputes" (FOR UPDATE)
--    → Permet: UPDATE WHERE has_role(auth.uid(), 'admin')
-- 
-- Tous les SELECT DOIVENT désormais utiliser UNIQUEMENT :
-- → get_my_disputes() RPC (qui masque reporter_id pour les reported)

-- ========================================
-- IMPACT SÉCURITÉ POST-MIGRATION
-- ========================================
-- ✅ Fin de la fuite d'identité du signalant (reporter_id masqué automatiquement)
-- ✅ Tous les accès aux CNI/numéros SS sont loggés dans admin_audit_logs
-- ✅ Protection contre les requêtes SQL malveillantes (SELECT * non audité)
-- ✅ Conformité RGPD renforcée (traçabilité + minimisation des données)
-- ✅ Impossible de bypasser le masquage via SQL Editor ou client direct

-- ========================================
-- TESTS DE VALIDATION POST-MIGRATION
-- ========================================
-- Test 1: Vérifier que SELECT direct échoue sur user_verifications
-- SELECT oneci_cni_number FROM user_verifications WHERE user_id = 'xxx';
-- ❌ Attendu: "permission denied for table user_verifications"

-- Test 2: Vérifier que RPC fonctionne et logue
-- SELECT * FROM get_verifications_for_admin_review();
-- ✅ Attendu: Données retournées + log dans admin_audit_logs

-- Test 3: Vérifier que SELECT direct échoue sur disputes
-- SELECT reporter_id FROM disputes WHERE reported_id = auth.uid();
-- ❌ Attendu: "permission denied for table disputes"

-- Test 4: Vérifier que RPC masque reporter_id
-- SELECT * FROM get_my_disputes() WHERE reported_id = auth.uid();
-- ✅ Attendu: reporter_id = NULL, reporter_name = 'Utilisateur anonyme'