-- PHASE 1: CORRECTIONS SÉCURITÉ CRITIQUES

-- ============================================================================
-- 1.1 SÉCURISER profiles_public VIEW
-- ============================================================================

-- Révoquer l'accès public à la vue profiles_public
REVOKE SELECT ON public.profiles_public FROM anon;

-- Créer une fonction RPC sécurisée pour permettre aux non-connectés
-- de voir UNIQUEMENT les infos du propriétaire d'une propriété spécifique
CREATE OR REPLACE FUNCTION public.get_property_owner_public_info(property_id_param uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  user_type user_type,
  city text,
  avatar_url text,
  is_verified boolean,
  oneci_verified boolean,
  face_verified boolean,
  cnam_verified boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Permet aux non-connectés de voir UNIQUEMENT les infos du propriétaire
  -- d'une propriété spécifique (pour page détail propriété)
  SELECT 
    pp.id, 
    pp.full_name, 
    pp.user_type, 
    pp.city, 
    pp.avatar_url,
    pp.is_verified, 
    pp.oneci_verified, 
    pp.face_verified,
    pp.cnam_verified
  FROM public.profiles_public pp
  INNER JOIN public.properties p ON p.owner_id = pp.id
  WHERE p.id = property_id_param
    AND p.moderation_status = 'approved';
$$;

-- ============================================================================
-- 1.2 SÉCURISER sensitive_data_access_monitoring VIEW
-- ============================================================================

-- Révoquer l'accès général et ne donner accès qu'aux super_admins
REVOKE SELECT ON public.sensitive_data_access_monitoring FROM authenticated;

-- Créer une policy RLS pour la vue (nécessite que la table sous-jacente ait RLS)
CREATE POLICY "Only super_admins can view sensitive data access monitoring"
ON public.sensitive_data_access_log
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- ============================================================================
-- 1.3 AJOUTER AUDIT LOGGING POUR guest_messages
-- ============================================================================

-- Fonction pour logger les accès admin aux messages invités
CREATE OR REPLACE FUNCTION public.log_admin_guest_message_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Logger uniquement les accès par les admins (pas les propriétaires)
  IF has_role(auth.uid(), 'admin'::app_role) AND auth.uid() != NEW.owner_id THEN
    INSERT INTO public.admin_audit_logs (
      admin_id, 
      action_type, 
      target_type, 
      target_id, 
      notes
    ) VALUES (
      auth.uid(),
      'guest_message_accessed',
      'guest_message',
      NEW.id,
      'Admin accessed guest message for property: ' || NEW.property_id::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Note: Trigger sur SELECT n'existe pas en PostgreSQL standard
-- On va plutôt créer une fonction RPC sécurisée pour les admins

-- Fonction RPC pour que les admins accèdent aux guest_messages avec audit
CREATE OR REPLACE FUNCTION public.admin_get_guest_messages(
  p_property_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  property_id uuid,
  owner_id uuid,
  guest_name text,
  guest_email text,
  guest_phone text,
  message_content text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  ip_address text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que l'appelant est admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can access all guest messages';
  END IF;

  -- Logger l'accès
  INSERT INTO public.admin_audit_logs (
    admin_id, 
    action_type, 
    target_type, 
    target_id,
    notes
  ) VALUES (
    auth.uid(),
    'guest_messages_bulk_accessed',
    'guest_message',
    COALESCE(p_property_id, '00000000-0000-0000-0000-000000000000'::uuid),
    CASE 
      WHEN p_property_id IS NOT NULL 
      THEN 'Admin accessed messages for property: ' || p_property_id::text
      ELSE 'Admin accessed all guest messages'
    END
  );

  -- Retourner les messages
  RETURN QUERY
  SELECT 
    gm.id,
    gm.property_id,
    gm.owner_id,
    gm.guest_name,
    gm.guest_email,
    gm.guest_phone,
    gm.message_content,
    gm.status,
    gm.created_at,
    gm.updated_at,
    gm.ip_address
  FROM public.guest_messages gm
  WHERE (p_property_id IS NULL OR gm.property_id = p_property_id)
  ORDER BY gm.created_at DESC
  LIMIT p_limit;
END;
$$;

-- ============================================================================
-- COMMENTAIRES DE DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION public.get_property_owner_public_info IS 
'Fonction sécurisée permettant aux utilisateurs non-connectés de voir uniquement les informations publiques du propriétaire d''une propriété approuvée spécifique';

COMMENT ON FUNCTION public.admin_get_guest_messages IS 
'Fonction sécurisée pour les admins d''accéder aux messages invités avec audit logging automatique';