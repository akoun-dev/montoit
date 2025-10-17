-- ============================================
-- Phase 1: Corrections Sécurité CRITIQUES
-- ============================================

-- 1.1: Sécuriser profiles_public View
-- --------------------------------------------

-- Révoquer l'accès public à la view profiles_public
REVOKE ALL ON profiles_public FROM anon, public, authenticated;

-- La fonction get_public_profile_safe existe déjà mais on la recrée pour s'assurer qu'elle est correcte
CREATE OR REPLACE FUNCTION public.get_public_profile_safe(target_user_id uuid)
RETURNS TABLE(
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
STABLE SECURITY DEFINER
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

-- 1.2: Sécuriser sensitive_data_access_monitoring View
-- --------------------------------------------

-- S'assurer que seuls les super_admins peuvent voir les logs d'accès sensibles
-- La table sensitive_data_access_log doit avoir une policy RLS
ALTER TABLE public.sensitive_data_access_log ENABLE ROW LEVEL SECURITY;

-- Policy pour super_admins seulement
CREATE POLICY "Super admins can view all sensitive data access logs"
ON public.sensitive_data_access_log
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- 1.3: Protéger property_alerts_analytics View
-- --------------------------------------------

-- S'assurer que alert_history a RLS activé
ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;

-- Policy pour permettre aux admins de voir les analytics
CREATE POLICY "Admins can view all alert history for analytics"
ON public.alert_history
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- 1.4: MFA Obligatoire pour Admins
-- --------------------------------------------

-- Insérer ou mettre à jour les politiques MFA pour admins et super_admins
INSERT INTO public.mfa_policies (role, mfa_required, grace_period_days)
VALUES 
  ('admin', true, 7),
  ('super_admin', true, 3)
ON CONFLICT (role) 
DO UPDATE SET 
  mfa_required = true,
  grace_period_days = EXCLUDED.grace_period_days,
  updated_at = now();

-- Fonction pour vérifier la compliance MFA des admins
CREATE OR REPLACE FUNCTION public.check_admin_mfa_compliance()
RETURNS TABLE(
  user_id uuid,
  full_name text,
  role app_role,
  has_mfa boolean,
  account_created_at timestamptz,
  grace_period_expires_at timestamptz,
  is_compliant boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que l'appelant est admin ou super_admin
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Only admins can check MFA compliance';
  END IF;

  RETURN QUERY
  SELECT 
    ur.user_id,
    p.full_name,
    ur.role,
    EXISTS(SELECT 1 FROM public.mfa_backup_codes WHERE user_id = ur.user_id) as has_mfa,
    p.created_at as account_created_at,
    (p.created_at + (
      SELECT INTERVAL '1 day' * mp.grace_period_days 
      FROM public.mfa_policies mp 
      WHERE mp.role = ur.role
    )) as grace_period_expires_at,
    (
      EXISTS(SELECT 1 FROM public.mfa_backup_codes WHERE user_id = ur.user_id)
      OR (p.created_at + (
        SELECT INTERVAL '1 day' * mp.grace_period_days 
        FROM public.mfa_policies mp 
        WHERE mp.role = ur.role
      )) > now()
    ) as is_compliant
  FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id
  LEFT JOIN public.mfa_policies mp ON mp.role = ur.role
  WHERE ur.role IN ('admin', 'super_admin')
  ORDER BY is_compliant ASC, p.created_at DESC;
END;
$$;

-- Fonction pour notifier les admins non-conformes
CREATE OR REPLACE FUNCTION public.notify_mfa_compliance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
  days_remaining INTEGER;
BEGIN
  FOR admin_record IN 
    SELECT * FROM public.check_admin_mfa_compliance()
    WHERE NOT is_compliant 
      AND grace_period_expires_at < now() + INTERVAL '2 days'
  LOOP
    -- Calculer les jours restants
    days_remaining := EXTRACT(day FROM (admin_record.grace_period_expires_at - now()))::INTEGER;
    
    INSERT INTO public.notifications (
      user_id, type, category, title, message, link, metadata
    ) VALUES (
      admin_record.user_id,
      'security_alert',
      'security',
      '🔐 MFA Obligatoire - Action Requise',
      'Votre compte admin doit activer l''authentification à deux facteurs. Accès limité dans ' || 
      GREATEST(days_remaining, 0) || ' jour(s).',
      '/settings/security',
      jsonb_build_object(
        'role', admin_record.role,
        'grace_period_expires_at', admin_record.grace_period_expires_at
      )
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- Créer un job cron pour vérifier quotidiennement la compliance MFA
SELECT cron.schedule(
  'check-mfa-compliance-daily',
  '0 9 * * *', -- 9h chaque matin
  $$ SELECT public.notify_mfa_compliance(); $$
);

-- 1.5: Fonction d'alerte pour accès suspects aux données sensibles
-- --------------------------------------------

CREATE OR REPLACE FUNCTION public.alert_suspicious_sensitive_access()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  suspicious_record RECORD;
BEGIN
  -- Détecter plus de 20 accès/heure par un admin
  FOR suspicious_record IN
    SELECT 
      requester_id,
      COUNT(*) as access_count,
      array_agg(DISTINCT data_type) as data_types
    FROM public.sensitive_data_access_log
    WHERE accessed_at > now() - INTERVAL '1 hour'
      AND access_granted = true
    GROUP BY requester_id
    HAVING COUNT(*) > 20
  LOOP
    INSERT INTO public.notifications (
      user_id, type, category, title, message, link, metadata
    ) VALUES (
      suspicious_record.requester_id,
      'security_alert',
      'security',
      '🚨 Activité Suspecte Détectée',
      'Plus de ' || suspicious_record.access_count || ' accès à des données sensibles dans la dernière heure. Types: ' || array_to_string(suspicious_record.data_types, ', '),
      '/admin',
      jsonb_build_object(
        'access_count', suspicious_record.access_count,
        'data_types', suspicious_record.data_types,
        'timestamp', now()
      )
    )
    ON CONFLICT DO NOTHING;
    
    -- Logger dans admin_audit_logs
    INSERT INTO public.admin_audit_logs (
      admin_id,
      action_type,
      target_type,
      target_id,
      notes,
      action_metadata
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      'suspicious_access_detected',
      'user',
      suspicious_record.requester_id,
      'Activité suspecte: ' || suspicious_record.access_count || ' accès en 1 heure',
      jsonb_build_object(
        'requester_id', suspicious_record.requester_id,
        'access_count', suspicious_record.access_count,
        'data_types', suspicious_record.data_types
      )
    );
  END LOOP;
END;
$$;

-- Créer un job cron pour surveiller les accès suspects toutes les 15 minutes
SELECT cron.schedule(
  'alert-suspicious-access',
  '*/15 * * * *', -- Toutes les 15 minutes
  $$ SELECT public.alert_suspicious_sensitive_access(); $$
);

-- 1.6: Déplacer pg_net vers schéma extensions
-- --------------------------------------------

-- Créer le schéma extensions s'il n'existe pas
CREATE SCHEMA IF NOT EXISTS extensions;

-- Note: Le déplacement de pg_net nécessite des privilèges superuser
-- Cette opération doit être effectuée manuellement via le dashboard Supabase
-- ou sera ignorée si l'extension existe déjà dans le schéma public
-- DROP EXTENSION IF EXISTS pg_net CASCADE;
-- CREATE EXTENSION pg_net SCHEMA extensions;

-- Ajouter extensions au search_path pour les fonctions futures
ALTER DATABASE postgres SET search_path TO public, extensions;

-- ============================================
-- Logging et Audit
-- ============================================

-- Fonction pour logger les accès aux profils publics
CREATE OR REPLACE FUNCTION public.log_public_profile_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Logger uniquement si l'accès est pour un autre utilisateur
  IF NEW.id != auth.uid() THEN
    INSERT INTO public.sensitive_data_access_log (
      requester_id,
      target_user_id,
      data_type,
      access_granted,
      relationship_type,
      metadata
    ) VALUES (
      auth.uid(),
      NEW.id,
      'public_profile',
      true,
      'profile_view',
      jsonb_build_object(
        'timestamp', now(),
        'viewed_fields', array['id', 'full_name', 'user_type', 'city', 'bio', 'avatar_url', 'verification_status']
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================
-- Vérifications Finales
-- ============================================

-- S'assurer que toutes les tables critiques ont RLS activé
DO $$
BEGIN
  -- Vérifier et activer RLS sur les tables critiques si nécessaire
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'sensitive_data_access_log') THEN
    ALTER TABLE public.sensitive_data_access_log ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'alert_history') THEN
    ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;