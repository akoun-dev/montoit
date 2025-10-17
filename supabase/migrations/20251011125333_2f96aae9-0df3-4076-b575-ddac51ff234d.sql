-- Phase 2: Messagerie pré-location améliorée
-- Ajouter colonne conversation_type dans messages

-- Ajouter colonne conversation_type
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS conversation_type text DEFAULT 'prospect'
CHECK (conversation_type IN ('prospect', 'applicant', 'tenant', 'landlord_support'));

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_messages_conversation_type 
ON public.messages(conversation_type);

-- Fonction RPC pour déterminer le type de conversation
CREATE OR REPLACE FUNCTION public.get_conversation_type(
  p_sender_id uuid,
  p_receiver_id uuid,
  p_property_id uuid DEFAULT NULL
)
RETURNS TEXT 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_application boolean;
  has_lease boolean;
BEGIN
  -- Vérifier si candidature existe (dans un sens ou l'autre)
  SELECT EXISTS (
    SELECT 1 FROM public.rental_applications
    WHERE (applicant_id = p_sender_id OR applicant_id = p_receiver_id)
      AND (p_property_id IS NULL OR property_id = p_property_id)
      AND status IN ('approved', 'pending', 'reviewing')
  ) INTO has_application;
  
  -- Vérifier si bail actif (dans un sens ou l'autre)
  SELECT EXISTS (
    SELECT 1 FROM public.leases
    WHERE (tenant_id = p_sender_id OR tenant_id = p_receiver_id)
      AND (landlord_id = p_sender_id OR landlord_id = p_receiver_id)
      AND (p_property_id IS NULL OR property_id = p_property_id)
      AND status = 'active'
  ) INTO has_lease;
  
  -- Déterminer type
  IF has_lease THEN
    RETURN 'tenant';
  ELSIF has_application THEN
    RETURN 'applicant';
  ELSE
    RETURN 'prospect';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_conversation_type(uuid, uuid, uuid) IS 
'Détermine le type de conversation (prospect/applicant/tenant) entre deux utilisateurs';

-- Mettre à jour les messages existants
UPDATE public.messages
SET conversation_type = public.get_conversation_type(sender_id, receiver_id, NULL)
WHERE conversation_type IS NULL OR conversation_type = 'prospect';