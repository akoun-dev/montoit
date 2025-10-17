-- Phase 3 : Sécurité et Contrôle d'accès

-- 1. Trigger pour logger les actions de modération de propriétés
CREATE OR REPLACE FUNCTION public.log_property_moderation()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.moderation_status IS DISTINCT FROM NEW.moderation_status AND NEW.moderated_by IS NOT NULL THEN
    INSERT INTO public.admin_audit_logs (
      admin_id,
      action_type,
      target_type,
      target_id,
      old_values,
      new_values,
      notes
    ) VALUES (
      NEW.moderated_by,
      'property_' || NEW.moderation_status,
      'property',
      NEW.id,
      jsonb_build_object('status', OLD.moderation_status),
      jsonb_build_object('status', NEW.moderation_status, 'moderated_at', NEW.moderated_at),
      NEW.moderation_notes
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_property_moderation_trigger
  AFTER UPDATE ON public.properties
  FOR EACH ROW
  WHEN (OLD.moderation_status IS DISTINCT FROM NEW.moderation_status)
  EXECUTE FUNCTION public.log_property_moderation();

-- 2. Fonction RPC sécurisée pour vérifier les rôles côté serveur
CREATE OR REPLACE FUNCTION public.verify_user_role(_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), _role);
$$;