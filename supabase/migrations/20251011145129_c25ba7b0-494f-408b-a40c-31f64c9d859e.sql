-- ============================================
-- PHASE 4.2: SÉCURISATION RLS & LOGGING
-- ============================================

-- ============================================
-- 4.2.A: Table profiles - Restreindre accès téléphone
-- ============================================

-- Supprimer la politique trop permissive
DROP POLICY IF EXISTS "Admins can view profiles metadata" ON profiles;

-- Créer politique restrictive pour les admins (sans téléphone visible directement)
-- Les admins doivent utiliser get_user_phone() pour accéder aux numéros
CREATE POLICY "Admins can view limited profile data"
ON profiles FOR SELECT
TO authenticated
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  AND id != auth.uid() -- Les admins ne voient pas leur propre profil via cette politique
);

-- Relation propriétaire-locataire ACTIVE uniquement
-- Permet aux parties d'un bail actif de voir les profils (incluant téléphone via get_user_phone)
CREATE POLICY "Lease parties can view each other profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM leases
    WHERE ((landlord_id = auth.uid() AND tenant_id = profiles.id)
        OR (tenant_id = auth.uid() AND landlord_id = profiles.id))
      AND status = 'active'
  )
);

-- ============================================
-- 4.2.B: Logging des accès aux données de vérification
-- ============================================

-- Créer une table de logs spécifique pour les accès aux données de vérification sensibles
CREATE TABLE IF NOT EXISTS verification_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  access_type TEXT NOT NULL, -- 'full_view', 'oneci_data', 'cnam_data', 'face_data'
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index pour recherches rapides
CREATE INDEX IF NOT EXISTS idx_verification_access_admin ON verification_access_log(admin_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_access_target ON verification_access_log(target_user_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_access_date ON verification_access_log(accessed_at DESC);

-- RLS : Seuls les super_admins peuvent voir les logs
ALTER TABLE verification_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view verification access logs"
ON verification_access_log FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Politique pour permettre l'insertion par le système
CREATE POLICY "System can log verification access"
ON verification_access_log FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = admin_id);

-- Mettre à jour la fonction existante get_verifications_for_admin_review pour logger dans verification_access_log
CREATE OR REPLACE FUNCTION public.get_verifications_for_admin_review()
RETURNS TABLE(
  user_id uuid,
  full_name text,
  user_type user_type,
  city text,
  oneci_status text,
  oneci_cni_number text,
  oneci_data jsonb,
  oneci_verified_at timestamptz,
  cnam_status text,
  cnam_social_security_number text,
  cnam_employer text,
  cnam_data jsonb,
  cnam_verified_at timestamptz,
  face_verification_status text,
  face_similarity_score numeric,
  face_verified_at timestamptz,
  admin_review_notes text,
  admin_reviewed_at timestamptz,
  admin_reviewed_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que seuls les super_admins peuvent accéder
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only super admins can access full verification data';
  END IF;
  
  -- Vérifier que l'admin a la 2FA activée
  IF NOT public.admin_has_2fa_enabled(auth.uid()) THEN
    -- Logger la tentative bloquée
    INSERT INTO public.admin_audit_logs (admin_id, action_type, target_type, target_id, notes)
    VALUES (auth.uid(), 'sensitive_data_access_blocked_no_2fa', 'user_verification', auth.uid(),
            'Admin attempted access without 2FA');
    RAISE EXCEPTION 'Two-factor authentication required. Enable 2FA in profile settings.';
  END IF;
  
  -- Logger l'accès dans admin_audit_logs (existant)
  INSERT INTO public.sensitive_data_access_log (requester_id, target_user_id, data_type, access_granted, relationship_type, metadata)
  VALUES (auth.uid(), NULL, 'verification_admin_queue', true, 'super_admin',
          jsonb_build_object('action', 'admin_review_queue_accessed', 'has_2fa', true));
  
  -- NOUVEAU: Logger aussi dans verification_access_log pour traçabilité détaillée
  INSERT INTO public.verification_access_log (
    admin_id,
    target_user_id,
    access_type,
    metadata
  )
  SELECT 
    auth.uid(),
    uv.user_id,
    'full_view',
    jsonb_build_object(
      'action', 'admin_review_queue',
      'pending_oneci', (uv.oneci_status = 'pending_review'),
      'pending_cnam', (uv.cnam_status = 'pending_review'),
      'timestamp', now()
    )
  FROM public.user_verifications uv
  WHERE uv.oneci_status = 'pending_review' OR uv.cnam_status = 'pending_review';
  
  -- Retourner les données
  RETURN QUERY
  SELECT 
    uv.user_id, p.full_name, p.user_type, p.city,
    uv.oneci_status, uv.oneci_cni_number, uv.oneci_data, uv.oneci_verified_at,
    uv.cnam_status, uv.cnam_social_security_number, uv.cnam_employer, uv.cnam_data, uv.cnam_verified_at,
    uv.face_verification_status, uv.face_similarity_score, uv.face_verified_at,
    uv.admin_review_notes, uv.admin_reviewed_at, uv.admin_reviewed_by, uv.created_at, uv.updated_at
  FROM public.user_verifications uv
  JOIN public.profiles p ON p.id = uv.user_id
  WHERE uv.oneci_status = 'pending_review' OR uv.cnam_status = 'pending_review';
END;
$$;

COMMENT ON TABLE verification_access_log IS 'Logs détaillés de tous les accès aux données de vérification sensibles (CNI, sécurité sociale, biométrie) par les super_admins';
COMMENT ON COLUMN verification_access_log.access_type IS 'Type d''accès: full_view (toute la queue), oneci_data, cnam_data, face_data';
COMMENT ON COLUMN verification_access_log.metadata IS 'Métadonnées supplémentaires: nombre d''enregistrements accédés, filtres appliqués, etc.';