-- =====================================================
-- PHASE 1: SYSTÈME DE GESTION DES DÉLAIS DE TRAITEMENT
-- =====================================================

-- 1. Table de configuration des délais
CREATE TABLE IF NOT EXISTS public.processing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.processing_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour processing_config
CREATE POLICY "Admins and tiers can view config"
ON public.processing_config FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'tiers_de_confiance'::app_role)
);

CREATE POLICY "Super admins can update config"
ON public.processing_config FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can insert config"
ON public.processing_config FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Configurations par défaut
INSERT INTO public.processing_config (config_key, config_value) VALUES
('application_processing_deadline_hours', '{"value": 48, "unit": "hours"}'::jsonb),
('auto_action_after_deadline', '{"action": "none", "enabled": false}'::jsonb)
ON CONFLICT (config_key) DO NOTHING;

-- 2. Ajouter colonnes aux rental_applications
ALTER TABLE public.rental_applications 
ADD COLUMN IF NOT EXISTS processing_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_overdue BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_processed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_action_type TEXT;

-- 3. Fonction pour calculer le délai de traitement
CREATE OR REPLACE FUNCTION public.calculate_processing_deadline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deadline_hours INTEGER;
BEGIN
  -- Récupérer le délai configuré
  SELECT (config_value->>'value')::INTEGER 
  INTO deadline_hours
  FROM public.processing_config 
  WHERE config_key = 'application_processing_deadline_hours';
  
  -- Si pas de config, utiliser 48h par défaut
  IF deadline_hours IS NULL THEN
    deadline_hours := 48;
  END IF;
  
  -- Calculer la deadline
  NEW.processing_deadline := NEW.created_at + (deadline_hours || ' hours')::INTERVAL;
  
  RETURN NEW;
END;
$$;

-- 4. Trigger pour auto-calcul du délai à la création
DROP TRIGGER IF EXISTS set_processing_deadline ON public.rental_applications;
CREATE TRIGGER set_processing_deadline
  BEFORE INSERT ON public.rental_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_processing_deadline();

-- 5. Fonction pour marquer les candidatures en retard
CREATE OR REPLACE FUNCTION public.mark_overdue_applications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.rental_applications
  SET is_overdue = true
  WHERE status = 'pending'
    AND processing_deadline < now()
    AND is_overdue = false;
END;
$$;

-- 6. Fonction pour action automatique post-délai
CREATE OR REPLACE FUNCTION public.auto_process_overdue_applications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  config_action TEXT;
  config_enabled BOOLEAN;
  processed_count INTEGER;
BEGIN
  -- Récupérer la config d'action automatique
  SELECT 
    config_value->>'action',
    (config_value->>'enabled')::BOOLEAN
  INTO config_action, config_enabled
  FROM public.processing_config 
  WHERE config_key = 'auto_action_after_deadline';
  
  -- Si activé et action définie (approved ou rejected)
  IF config_enabled AND config_action IN ('approved', 'rejected') THEN
    WITH updated AS (
      UPDATE public.rental_applications
      SET 
        status = config_action::TEXT,
        auto_processed = true,
        auto_action_type = config_action,
        reviewed_at = now(),
        updated_at = now()
      WHERE status = 'pending'
        AND is_overdue = true
        AND auto_processed = false
      RETURNING *
    )
    SELECT COUNT(*) INTO processed_count FROM updated;
    
    -- Logger l'action dans admin_audit_logs
    IF processed_count > 0 THEN
      INSERT INTO public.admin_audit_logs (
        admin_id,
        action_type,
        target_type,
        target_id,
        notes,
        action_metadata
      ) VALUES (
        '00000000-0000-0000-0000-000000000000'::uuid, -- System action
        'auto_process_overdue_applications',
        'rental_application',
        '00000000-0000-0000-0000-000000000000'::uuid,
        'Action automatique: ' || processed_count || ' dossiers ' || config_action,
        jsonb_build_object(
          'action', config_action,
          'count', processed_count,
          'timestamp', now()
        )
      );
    END IF;
  END IF;
END;
$$;

-- 7. Mettre à jour les candidatures existantes avec un délai
UPDATE public.rental_applications
SET processing_deadline = created_at + INTERVAL '48 hours'
WHERE processing_deadline IS NULL;

-- 8. Marquer immédiatement les retards existants
SELECT public.mark_overdue_applications();

-- 9. Index pour performance
CREATE INDEX IF NOT EXISTS idx_rental_applications_overdue 
ON public.rental_applications(status, is_overdue) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_rental_applications_deadline 
ON public.rental_applications(processing_deadline) 
WHERE status = 'pending';

-- 10. Trigger pour audit log des changements de config
CREATE OR REPLACE FUNCTION public.log_processing_config_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_audit_logs (
    admin_id,
    action_type,
    target_type,
    target_id,
    old_values,
    new_values,
    notes
  ) VALUES (
    COALESCE(NEW.updated_by, auth.uid()),
    'processing_config_updated',
    'processing_config',
    NEW.id,
    to_jsonb(OLD),
    to_jsonb(NEW),
    'Configuration du traitement des dossiers modifiée: ' || NEW.config_key
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_processing_config_changes ON public.processing_config;
CREATE TRIGGER log_processing_config_changes
  AFTER UPDATE ON public.processing_config
  FOR EACH ROW
  EXECUTE FUNCTION public.log_processing_config_changes();