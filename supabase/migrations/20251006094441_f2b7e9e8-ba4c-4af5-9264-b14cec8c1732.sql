-- Promouvoir patrick.somet@ansut.ci en super_admin (uniquement si l'utilisateur existe)
DO $$
DECLARE
  user_exists BOOLEAN;
BEGIN
  -- Vérifier si l'utilisateur existe dans auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = 'afbc7c0c-6776-4d38-8ea9-544aea08aa32'::uuid) INTO user_exists;

  IF user_exists THEN
    -- L'utilisateur existe, ajouter les rôles
    INSERT INTO public.user_roles (user_id, role)
    VALUES
      ('afbc7c0c-6776-4d38-8ea9-544aea08aa32', 'super_admin'),
      ('afbc7c0c-6776-4d38-8ea9-544aea08aa32', 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Logger l'action dans admin_audit_logs (si la table existe)
    BEGIN
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
    EXCEPTION WHEN undefined_table THEN
      -- La table admin_audit_logs n'existe pas, ignorer
      NULL;
    END;

    RAISE NOTICE 'Rôles admin ajoutés pour patrick.somet@ansut.ci';
  ELSE
    RAISE NOTICE 'Utilisateur patrick.somet@ansut.ci (afbc7c0c-6776-4d38-8ea9-544aea08aa32) non trouvé, skipping role assignment';
    RAISE NOTICE 'Pour créer cet utilisateur:';
    RAISE NOTICE '1. Allez dans le dashboard Supabase > Authentication';
    RAISE NOTICE '2. Créez l''utilisateur avec l''email patrick.somet@ansut.ci';
    RAISE NOTICE '3. Notez son UUID et mettez à jour cette migration si nécessaire';
  END IF;
END $$;