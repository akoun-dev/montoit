-- ============================================
-- PHASE 3 (CORRIGÉE): Restreindre l'accès à user_verifications
-- ============================================
-- Note: PostgreSQL ne supporte pas AFTER SELECT trigger
-- On utilise donc uniquement les policies RLS restreintes

-- 1. Supprimer l'ancienne policy trop permissive pour les admins
DROP POLICY IF EXISTS "Admins can view all verifications" ON public.user_verifications;

-- 2. Créer une policy pour que seuls les super_admins voient toutes les vérifications
CREATE POLICY "Super admins can view all verifications"
ON public.user_verifications
FOR SELECT
TO authenticated
USING (
  (auth.uid() = user_id) OR 
  public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- 3. Créer une policy pour que les tiers de confiance voient les vérifications en attente
CREATE POLICY "Trusted third parties can view pending verifications"
ON public.user_verifications
FOR SELECT
TO authenticated
USING (
  public.is_trusted_third_party(auth.uid()) AND
  (oneci_status = 'pending_review' OR cnam_status = 'pending_review')
);

-- Commentaires pour documentation
COMMENT ON POLICY "Super admins can view all verifications" ON public.user_verifications IS
'Seuls les super admins peuvent voir toutes les vérifications. Les admins standard ne peuvent plus accéder à ces données sensibles.';

COMMENT ON POLICY "Trusted third parties can view pending verifications" ON public.user_verifications IS
'Les tiers de confiance peuvent voir uniquement les vérifications en attente de validation (pending_review).';