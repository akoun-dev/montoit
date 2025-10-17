-- Créer la table admin_audit_logs
CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX idx_audit_logs_admin ON admin_audit_logs(admin_id);
CREATE INDEX idx_audit_logs_created ON admin_audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON admin_audit_logs(action_type);
CREATE INDEX idx_audit_logs_target ON admin_audit_logs(target_type, target_id);

-- RLS
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs"
ON admin_audit_logs FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Fonction pour logger les certifications de baux
CREATE OR REPLACE FUNCTION log_lease_certification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.certification_status IS DISTINCT FROM NEW.certification_status THEN
    INSERT INTO admin_audit_logs (
      admin_id,
      action_type,
      target_type,
      target_id,
      old_values,
      new_values,
      notes
    ) VALUES (
      COALESCE(NEW.certified_by, auth.uid()),
      'lease_' || NEW.certification_status,
      'lease',
      NEW.id,
      jsonb_build_object(
        'status', OLD.certification_status,
        'certified_at', OLD.ansut_certified_at
      ),
      jsonb_build_object(
        'status', NEW.certification_status,
        'certified_at', NEW.ansut_certified_at
      ),
      NEW.certification_notes
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger pour les certifications de baux
DROP TRIGGER IF EXISTS trigger_log_lease_certification ON public.leases;
CREATE TRIGGER trigger_log_lease_certification
AFTER UPDATE ON public.leases
FOR EACH ROW
EXECUTE FUNCTION log_lease_certification();

-- Fonction pour logger les changements de rôles
CREATE OR REPLACE FUNCTION log_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO admin_audit_logs (
      admin_id,
      action_type,
      target_type,
      target_id,
      old_values,
      new_values
    ) VALUES (
      auth.uid(),
      'role_assigned',
      'user',
      NEW.user_id,
      NULL,
      jsonb_build_object('role', NEW.role)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO admin_audit_logs (
      admin_id,
      action_type,
      target_type,
      target_id,
      old_values,
      new_values
    ) VALUES (
      auth.uid(),
      'role_revoked',
      'user',
      OLD.user_id,
      jsonb_build_object('role', OLD.role),
      NULL
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger pour les changements de rôles
DROP TRIGGER IF EXISTS trigger_log_role_changes ON public.user_roles;
CREATE TRIGGER trigger_log_role_changes
AFTER INSERT OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION log_role_changes();

-- Fonction pour logger les résolutions de litiges
CREATE OR REPLACE FUNCTION log_dispute_resolution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO admin_audit_logs (
      admin_id,
      action_type,
      target_type,
      target_id,
      old_values,
      new_values,
      notes
    ) VALUES (
      COALESCE(NEW.assigned_to, auth.uid()),
      'dispute_' || NEW.status,
      'dispute',
      NEW.id,
      jsonb_build_object(
        'status', OLD.status,
        'priority', OLD.priority
      ),
      jsonb_build_object(
        'status', NEW.status,
        'priority', NEW.priority,
        'resolved_at', NEW.resolved_at
      ),
      NEW.resolution_notes
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger pour les résolutions de litiges
DROP TRIGGER IF EXISTS trigger_log_dispute_resolution ON public.disputes;
CREATE TRIGGER trigger_log_dispute_resolution
AFTER UPDATE ON public.disputes
FOR EACH ROW
EXECUTE FUNCTION log_dispute_resolution();