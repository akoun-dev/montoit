-- ============================================
-- Tâche 3.6: Audit Logs Viewer - Migration (Partie 2 - Sans Cron)
-- ============================================

-- 1. Mettre à jour les RLS policies sur admin_audit_logs
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.admin_audit_logs;

-- Super-admins peuvent voir tous les logs
CREATE POLICY "Super admins can view all audit logs"
ON public.admin_audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Admins normaux peuvent voir uniquement leurs propres logs
CREATE POLICY "Admins can view their own audit logs"
ON public.admin_audit_logs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') 
  AND admin_id = auth.uid()
);

-- 2. Fonction de nettoyage des logs de plus de 1 an
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.admin_audit_logs
  WHERE created_at < NOW() - INTERVAL '1 year';
  
  RAISE NOTICE 'Cleaned up audit logs older than 1 year';
END;
$$;

-- 3. Fonction helper pour promouvoir un utilisateur en super-admin
CREATE OR REPLACE FUNCTION public.promote_to_super_admin(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que l'appelant est déjà super-admin (sauf si c'est la première promotion)
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') THEN
    IF NOT public.has_role(auth.uid(), 'super_admin') THEN
      RAISE EXCEPTION 'Only super-admins can promote users to super-admin';
    END IF;
  END IF;
  
  -- Ajouter le rôle super_admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Ajouter aussi le rôle admin si pas déjà présent
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Log l'action
  INSERT INTO public.admin_audit_logs (
    admin_id,
    action_type,
    target_type,
    target_id,
    notes
  ) VALUES (
    COALESCE(auth.uid(), target_user_id),
    'role_assigned',
    'user',
    target_user_id,
    'Promoted to super_admin'
  );
END;
$$;