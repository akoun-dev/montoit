-- =====================================================
-- PHASE 0: CORRECTION VULNÉRABILITÉS CRITIQUES
-- Date: 2025-10-10
-- Estimé: 4 jours
-- =====================================================

-- =====================================================
-- 1. CORRIGER POLICY REVIEWS (Vulnérabilité: OR true)
-- =====================================================

-- Supprimer l'ancienne policy vulnérable
DROP POLICY IF EXISTS "Users can view reviews about them or by them" ON public.reviews;

-- Créer nouvelle policy sécurisée (reviewer OU reviewee peuvent voir)
CREATE POLICY "Users can view reviews about them or by them" 
ON public.reviews
FOR SELECT 
USING (
  auth.uid() = reviewer_id OR auth.uid() = reviewee_id
);

-- Les admins peuvent voir toutes les reviews pour modération
CREATE POLICY "Admins can view all reviews for moderation"
ON public.reviews
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- =====================================================
-- 2. RESTREINDRE REPUTATION_SCORES AUX AUTHENTIFIÉS
-- =====================================================

-- Supprimer policy publique vulnérable
DROP POLICY IF EXISTS "Everyone can view reputation scores" ON public.reputation_scores;

-- Créer policy restreinte aux utilisateurs authentifiés
CREATE POLICY "Authenticated users can view reputation scores"
ON public.reputation_scores
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- =====================================================
-- 3. LIMITER MFA_POLICIES AUX ADMINS
-- =====================================================

-- Supprimer policy publique vulnérable
DROP POLICY IF EXISTS "Everyone can view MFA policies" ON public.mfa_policies;

-- Créer policy restreinte aux admins et à soi-même
CREATE POLICY "Users can view their own MFA policy"
ON public.mfa_policies
FOR SELECT
USING (
  -- L'utilisateur peut voir sa propre policy
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = mfa_policies.role
  )
  OR 
  -- Les admins peuvent voir toutes les policies
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- =====================================================
-- 4. AJOUTER RLS SUR PROFILES_PUBLIC VIEW
-- =====================================================

-- Note: Les VIEWs ne supportent pas RLS directement
-- Solution: Créer une fonction sécurisée pour accès contrôlé

CREATE OR REPLACE FUNCTION public.get_public_profile_safe(target_user_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  user_type user_type,
  city text,
  bio text,
  avatar_url text,
  oneci_verified boolean,
  cnam_verified boolean,
  face_verified boolean,
  is_verified boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Seuls les utilisateurs authentifiés peuvent accéder aux profils publics
  SELECT 
    p.id,
    p.full_name,
    p.user_type,
    p.city,
    p.bio,
    p.avatar_url,
    p.oneci_verified,
    p.cnam_verified,
    p.face_verified,
    p.is_verified
  FROM public.profiles p
  WHERE p.id = target_user_id
    AND auth.uid() IS NOT NULL; -- Requiert authentification
$$;

-- =====================================================
-- 5. TABLE SÉCURISÉE POUR SECRETS D'INTÉGRATION
-- =====================================================

-- Créer table pour stocker secrets d'intégration (chiffrés)
CREATE TABLE IF NOT EXISTS public.admin_integration_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_name text NOT NULL UNIQUE,
  encrypted_config jsonb NOT NULL, -- Stockage chiffré des clés
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  CONSTRAINT valid_integration_name CHECK (
    integration_name IN ('cinetpay', 'brevo', 'azure_face', 'openai', 'mapbox')
  )
);

-- Activer RLS
ALTER TABLE public.admin_integration_secrets ENABLE ROW LEVEL SECURITY;

-- Policy: Seuls les super_admins peuvent accéder
CREATE POLICY "Super admins can manage integration secrets"
ON public.admin_integration_secrets
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Fonction pour récupérer un secret (avec audit)
CREATE OR REPLACE FUNCTION public.get_integration_secret(p_integration_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config jsonb;
BEGIN
  -- Vérifier que l'appelant est super_admin
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only super admins can access integration secrets';
  END IF;

  -- Logger l'accès
  INSERT INTO public.admin_audit_logs (
    admin_id, action_type, target_type, target_id, notes
  ) VALUES (
    auth.uid(),
    'integration_secret_accessed',
    'integration',
    gen_random_uuid(),
    'Integration: ' || p_integration_name
  );

  -- Récupérer le secret
  SELECT encrypted_config INTO v_config
  FROM public.admin_integration_secrets
  WHERE integration_name = p_integration_name;

  RETURN v_config;
END;
$$;

-- Fonction pour sauvegarder un secret (avec audit)
CREATE OR REPLACE FUNCTION public.save_integration_secret(
  p_integration_name text,
  p_encrypted_config jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que l'appelant est super_admin
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only super admins can save integration secrets';
  END IF;

  -- Logger l'action
  INSERT INTO public.admin_audit_logs (
    admin_id, action_type, target_type, target_id, notes
  ) VALUES (
    auth.uid(),
    'integration_secret_saved',
    'integration',
    gen_random_uuid(),
    'Integration: ' || p_integration_name
  );

  -- Upsert le secret
  INSERT INTO public.admin_integration_secrets (
    integration_name, encrypted_config, created_by, updated_at
  ) VALUES (
    p_integration_name, p_encrypted_config, auth.uid(), now()
  )
  ON CONFLICT (integration_name) 
  DO UPDATE SET 
    encrypted_config = EXCLUDED.encrypted_config,
    updated_at = now();
END;
$$;

-- =====================================================
-- 6. TRIGGER POUR UPDATE TIMESTAMPS
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_integration_secrets_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_integration_secrets_timestamp
BEFORE UPDATE ON public.admin_integration_secrets
FOR EACH ROW
EXECUTE FUNCTION public.update_integration_secrets_updated_at();

-- =====================================================
-- COMMENTAIRES POUR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.admin_integration_secrets IS 
'Stockage sécurisé des clés API et secrets pour intégrations tierces. Accès restreint aux super_admins uniquement.';

COMMENT ON FUNCTION public.get_integration_secret(text) IS 
'Récupère un secret d''intégration de manière sécurisée avec audit. Restreint aux super_admins.';

COMMENT ON FUNCTION public.save_integration_secret(text, jsonb) IS 
'Sauvegarde un secret d''intégration de manière sécurisée avec audit. Restreint aux super_admins.';