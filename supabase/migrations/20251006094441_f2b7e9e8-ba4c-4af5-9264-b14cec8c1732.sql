-- Promouvoir patrick.somet@ansut.ci en super_admin
INSERT INTO public.user_roles (user_id, role)
VALUES
  ('afbc7c0c-6776-4d38-8ea9-544aea08aa32', 'super_admin'),
  ('afbc7c0c-6776-4d38-8ea9-544aea08aa32', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Logger l'action dans admin_audit_logs
INSERT INTO public.admin_audit_logs (
  admin_id,
  action_type,
  target_type,
  target_id,
  notes
) VALUES (
  NULL,
  'role_assigned',
  'user',
  'afbc7c0c-6776-4d38-8ea9-544aea08aa32',
  'Promotion en super_admin: patrick.somet@ansut.ci'
);