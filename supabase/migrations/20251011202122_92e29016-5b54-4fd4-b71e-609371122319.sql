-- =====================================================
-- PHASE 1: Gestion déléguée agences - Infrastructure DB (CORRIGÉ)
-- =====================================================

-- 1. Création de la table agency_mandates
CREATE TABLE IF NOT EXISTS public.agency_mandates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  
  -- Type de mandat
  mandate_type TEXT NOT NULL CHECK (mandate_type IN ('location', 'gestion_complete', 'vente')),
  
  -- Conditions financières
  commission_rate NUMERIC CHECK (commission_rate >= 0 AND commission_rate <= 100),
  fixed_fee NUMERIC CHECK (fixed_fee >= 0),
  billing_frequency TEXT CHECK (billing_frequency IN ('mensuel', 'trimestriel', 'annuel', 'par_transaction')),
  
  -- Permissions granulaires (JSONB pour flexibilité)
  permissions JSONB NOT NULL DEFAULT '{
    "can_view_properties": true,
    "can_edit_properties": false,
    "can_create_properties": false,
    "can_delete_properties": false,
    "can_view_applications": true,
    "can_manage_applications": false,
    "can_create_leases": false,
    "can_view_financials": false,
    "can_manage_maintenance": false,
    "can_communicate_tenants": true,
    "can_manage_documents": false
  }'::jsonb,
  
  -- Durée du mandat
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- Statut du mandat
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'terminated', 'expired')),
  
  -- Métadonnées
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  terminated_at TIMESTAMPTZ,
  terminated_by UUID REFERENCES public.profiles(id),
  termination_reason TEXT,
  
  -- Contraintes
  CHECK (end_date IS NULL OR end_date > start_date),
  CHECK (property_id IS NOT NULL OR mandate_type = 'gestion_complete')
);

-- Index pour performance
CREATE INDEX idx_agency_mandates_agency_id ON public.agency_mandates(agency_id);
CREATE INDEX idx_agency_mandates_owner_id ON public.agency_mandates(owner_id);
CREATE INDEX idx_agency_mandates_property_id ON public.agency_mandates(property_id);
CREATE INDEX idx_agency_mandates_status ON public.agency_mandates(status);
CREATE INDEX idx_agency_mandates_active ON public.agency_mandates(agency_id, owner_id) WHERE status = 'active';

-- Trigger pour updated_at automatique
CREATE TRIGGER set_agency_mandates_updated_at
  BEFORE UPDATE ON public.agency_mandates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_property_alerts_updated_at();

-- 2. Fonction d'expiration automatique des mandats
CREATE OR REPLACE FUNCTION public.auto_expire_mandates()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.agency_mandates
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'active'
    AND end_date IS NOT NULL
    AND end_date < CURRENT_DATE;
END;
$$;

-- 3. Enable RLS sur agency_mandates
ALTER TABLE public.agency_mandates ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies pour agency_mandates

-- Agences peuvent voir leurs mandats
CREATE POLICY "Agences voient leurs mandats"
  ON public.agency_mandates
  FOR SELECT
  USING (auth.uid() = agency_id);

-- Propriétaires peuvent voir leurs mandats
CREATE POLICY "Propriétaires voient leurs mandats"
  ON public.agency_mandates
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Propriétaires peuvent créer des mandats (invitations)
CREATE POLICY "Propriétaires créent mandats"
  ON public.agency_mandates
  FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id 
    AND status = 'pending'
  );

-- Agences et propriétaires peuvent mettre à jour leurs mandats
CREATE POLICY "Parties modifient mandats"
  ON public.agency_mandates
  FOR UPDATE
  USING (
    auth.uid() = agency_id OR auth.uid() = owner_id
  );

-- Admins peuvent tout gérer
CREATE POLICY "Admins gèrent tous mandats"
  ON public.agency_mandates
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. Fonction helper pour vérifier les droits d'une agence
CREATE OR REPLACE FUNCTION public.agency_can_manage_property(
  _agency_id UUID,
  _property_id UUID,
  _required_permission TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _mandate RECORD;
  _has_permission BOOLEAN;
BEGIN
  -- Chercher un mandat actif (spécifique OU global)
  SELECT * INTO _mandate
  FROM public.agency_mandates
  WHERE agency_id = _agency_id
    AND (property_id = _property_id OR property_id IS NULL)
    AND status = 'active'
    AND start_date <= CURRENT_DATE
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  ORDER BY property_id NULLS LAST
  LIMIT 1;
  
  -- Aucun mandat trouvé
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Si aucune permission spécifique demandée, retourner TRUE
  IF _required_permission IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Vérifier la permission JSONB
  SELECT COALESCE((_mandate.permissions->>_required_permission)::boolean, false)
  INTO _has_permission;
  
  RETURN _has_permission;
END;
$$;

-- 6. Fonction helper pour vérifier si une agence peut créer un bien pour un propriétaire
CREATE OR REPLACE FUNCTION public.agency_can_create_for_owner(
  _agency_id UUID,
  _owner_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.agency_mandates
    WHERE agency_id = _agency_id
      AND owner_id = _owner_id
      AND property_id IS NULL
      AND status = 'active'
      AND start_date <= CURRENT_DATE
      AND (end_date IS NULL OR end_date >= CURRENT_DATE)
      AND (permissions->>'can_create_properties')::boolean = true
  );
END;
$$;

-- 7. Trigger de notification à la création de mandat
CREATE OR REPLACE FUNCTION public.notify_mandate_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _agency_name TEXT;
  _owner_name TEXT;
  _property_title TEXT;
BEGIN
  -- Récupérer les noms
  SELECT full_name INTO _agency_name FROM public.profiles WHERE id = NEW.agency_id;
  SELECT full_name INTO _owner_name FROM public.profiles WHERE id = NEW.owner_id;
  
  IF NEW.property_id IS NOT NULL THEN
    SELECT title INTO _property_title FROM public.properties WHERE id = NEW.property_id;
  END IF;
  
  -- Notification à l'agence
  INSERT INTO public.notifications (
    user_id, type, category, title, message, link, metadata
  ) VALUES (
    NEW.agency_id,
    'mandate_invitation',
    'mandate',
    'Nouvelle invitation de mandat',
    CASE 
      WHEN NEW.property_id IS NOT NULL 
      THEN _owner_name || ' vous invite à gérer le bien "' || _property_title || '"'
      ELSE _owner_name || ' vous invite à gérer ses biens (mandat global)'
    END,
    '/dashboard/agence',
    jsonb_build_object(
      'mandate_id', NEW.id,
      'owner_id', NEW.owner_id,
      'property_id', NEW.property_id,
      'mandate_type', NEW.mandate_type
    )
  );
  
  -- Notification au propriétaire
  INSERT INTO public.notifications (
    user_id, type, category, title, message, link, metadata
  ) VALUES (
    NEW.owner_id,
    'mandate_created',
    'mandate',
    'Invitation de mandat envoyée',
    'Votre invitation à ' || _agency_name || ' a été envoyée',
    '/my-mandates',
    jsonb_build_object(
      'mandate_id', NEW.id,
      'agency_id', NEW.agency_id,
      'property_id', NEW.property_id
    )
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_mandate_creation
  AFTER INSERT ON public.agency_mandates
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_mandate_creation();

-- 8. Trigger de log et notification sur changements
CREATE OR REPLACE FUNCTION public.log_mandate_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _agency_name TEXT;
  _owner_name TEXT;
BEGIN
  -- Seulement si changement de statut
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT full_name INTO _agency_name FROM public.profiles WHERE id = NEW.agency_id;
    SELECT full_name INTO _owner_name FROM public.profiles WHERE id = NEW.owner_id;
    
    -- Log dans admin_audit_logs
    INSERT INTO public.admin_audit_logs (
      admin_id, action_type, target_type, target_id, old_values, new_values, notes
    ) VALUES (
      COALESCE(NEW.terminated_by, auth.uid()),
      'mandate_' || NEW.status,
      'agency_mandate',
      NEW.id,
      jsonb_build_object('status', OLD.status, 'accepted_at', OLD.accepted_at),
      jsonb_build_object('status', NEW.status, 'accepted_at', NEW.accepted_at, 'terminated_at', NEW.terminated_at),
      COALESCE(NEW.termination_reason, 'Changement de statut: ' || OLD.status || ' -> ' || NEW.status)
    );
    
    -- Notifications selon le nouveau statut
    IF NEW.status = 'active' THEN
      INSERT INTO public.notifications (
        user_id, type, category, title, message, link, metadata
      ) VALUES (
        NEW.owner_id,
        'mandate_accepted',
        'mandate',
        'Mandat accepté',
        _agency_name || ' a accepté votre mandat de gestion',
        '/my-mandates',
        jsonb_build_object('mandate_id', NEW.id, 'agency_id', NEW.agency_id)
      );
      
      INSERT INTO public.notifications (
        user_id, type, category, title, message, link, metadata
      ) VALUES (
        NEW.agency_id,
        'mandate_activated',
        'mandate',
        'Mandat activé',
        'Votre mandat avec ' || _owner_name || ' est maintenant actif',
        '/dashboard/agence',
        jsonb_build_object('mandate_id', NEW.id, 'owner_id', NEW.owner_id)
      );
      
    ELSIF NEW.status = 'terminated' THEN
      INSERT INTO public.notifications (
        user_id, type, category, title, message, link, metadata
      ) VALUES (
        NEW.owner_id,
        'mandate_terminated',
        'mandate',
        'Mandat résilié',
        'Le mandat avec ' || _agency_name || ' a été résilié',
        '/my-mandates',
        jsonb_build_object('mandate_id', NEW.id, 'reason', NEW.termination_reason)
      );
      
      INSERT INTO public.notifications (
        user_id, type, category, title, message, link, metadata
      ) VALUES (
        NEW.agency_id,
        'mandate_terminated',
        'mandate',
        'Mandat résilié',
        'Le mandat avec ' || _owner_name || ' a été résilié',
        '/dashboard/agence',
        jsonb_build_object('mandate_id', NEW.id, 'reason', NEW.termination_reason)
      );
      
    ELSIF NEW.status = 'expired' THEN
      INSERT INTO public.notifications (
        user_id, type, category, title, message, link, metadata
      ) VALUES (
        NEW.owner_id,
        'mandate_expired',
        'mandate',
        'Mandat expiré',
        'Le mandat avec ' || _agency_name || ' a expiré',
        '/my-mandates',
        jsonb_build_object('mandate_id', NEW.id)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_mandate_changes
  AFTER UPDATE ON public.agency_mandates
  FOR EACH ROW
  EXECUTE FUNCTION public.log_mandate_changes();

-- 9. Nouvelles RLS policies pour properties

CREATE POLICY "Agences voient biens mandatés"
  ON public.properties
  FOR SELECT
  USING (
    public.agency_can_manage_property(auth.uid(), id)
  );

CREATE POLICY "Agences modifient biens mandatés"
  ON public.properties
  FOR UPDATE
  USING (
    public.agency_can_manage_property(auth.uid(), id, 'can_edit_properties')
  );

CREATE POLICY "Agences créent biens mandatés"
  ON public.properties
  FOR INSERT
  WITH CHECK (
    public.agency_can_create_for_owner(auth.uid(), owner_id)
  );

CREATE POLICY "Agences suppriment biens mandatés"
  ON public.properties
  FOR DELETE
  USING (
    public.agency_can_manage_property(auth.uid(), id, 'can_delete_properties')
  );

-- 10. Nouvelles RLS policies pour rental_applications

CREATE POLICY "Agences voient candidatures mandatées"
  ON public.rental_applications
  FOR SELECT
  USING (
    property_id IN (
      SELECT id FROM public.properties
      WHERE public.agency_can_manage_property(auth.uid(), id, 'can_view_applications')
    )
  );

CREATE POLICY "Agences gèrent candidatures mandatées"
  ON public.rental_applications
  FOR UPDATE
  USING (
    property_id IN (
      SELECT id FROM public.properties
      WHERE public.agency_can_manage_property(auth.uid(), id, 'can_manage_applications')
    )
  );