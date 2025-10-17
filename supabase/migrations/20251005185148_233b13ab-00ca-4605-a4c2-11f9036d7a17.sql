-- ============================================
-- PHASE 2: Restreindre l'accès direct à la table profiles
-- ============================================
-- Objectif: Supprimer la policy trop permissive et forcer l'utilisation
-- de profiles_public pour l'accès général

-- 1. Supprimer l'ancienne policy trop permissive
DROP POLICY IF EXISTS "Profiles sont visibles par tous les utilisateurs authentifiés" ON public.profiles;

-- 2. Créer une policy pour que les utilisateurs voient leur propre profil complet
CREATE POLICY "Users can view their own complete profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 3. Créer une policy pour que les propriétaires voient les profils de leurs candidats
-- (sans le téléphone, ils utiliseront la vue profiles_public)
CREATE POLICY "Landlords can view applicant profiles via view"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT ra.applicant_id 
    FROM public.rental_applications ra
    JOIN public.properties p ON p.id = ra.property_id
    WHERE p.owner_id = auth.uid()
  )
);

-- 4. Créer une policy pour que les candidats voient les profils des propriétaires
CREATE POLICY "Applicants can view landlord profiles via view"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT p.owner_id 
    FROM public.rental_applications ra
    JOIN public.properties p ON p.id = ra.property_id
    WHERE ra.applicant_id = auth.uid()
  )
);

-- 5. Créer une policy pour que les parties d'un bail se voient mutuellement
CREATE POLICY "Lease parties can view each other profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT l.landlord_id FROM public.leases l WHERE l.tenant_id = auth.uid()
    UNION
    SELECT l.tenant_id FROM public.leases l WHERE l.landlord_id = auth.uid()
  )
);

-- 6. Créer une policy pour que les admins voient tous les profils
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Commentaires pour documentation
COMMENT ON POLICY "Users can view their own complete profile" ON public.profiles IS
'Les utilisateurs peuvent voir leur propre profil complet incluant le téléphone';

COMMENT ON POLICY "Landlords can view applicant profiles via view" ON public.profiles IS
'Les propriétaires peuvent voir les profils de leurs candidats (utiliser profiles_public pour éviter le téléphone)';

COMMENT ON POLICY "Applicants can view landlord profiles via view" ON public.profiles IS
'Les candidats peuvent voir les profils des propriétaires contactés (utiliser profiles_public pour éviter le téléphone)';

COMMENT ON POLICY "Lease parties can view each other profiles" ON public.profiles IS
'Les parties d''un bail peuvent voir mutuellement leurs profils';

COMMENT ON POLICY "Admins can view all profiles" ON public.profiles IS
'Les administrateurs peuvent voir tous les profils pour la modération';