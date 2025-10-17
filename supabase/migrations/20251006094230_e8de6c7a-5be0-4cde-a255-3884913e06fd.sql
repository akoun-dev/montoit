-- Rendre admin_id nullable dans admin_audit_logs
ALTER TABLE public.admin_audit_logs 
ALTER COLUMN admin_id DROP NOT NULL;

-- Ajouter un commentaire pour documenter que NULL signifie "action système"
COMMENT ON COLUMN public.admin_audit_logs.admin_id IS 
'ID de l''admin qui a effectué l''action. NULL pour les actions système automatiques (ex: création de compte utilisateur)';

-- Mettre à jour la fonction handle_new_user pour logger la création avec admin_id NULL
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Nouvel utilisateur'),
    COALESCE((NEW.raw_user_meta_data->>'user_type')::public.user_type, 'locataire')
  );
  
  -- Attribuer le rôle 'user' par défaut
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Logger la création du compte (admin_id sera NULL car c'est une auto-inscription)
  INSERT INTO public.admin_audit_logs (
    admin_id,
    action_type,
    target_type,
    target_id,
    notes
  ) VALUES (
    NULL, -- NULL car c'est une auto-inscription, pas une action admin
    'user_created',
    'user',
    NEW.id,
    'Auto-inscription utilisateur: ' || COALESCE(NEW.raw_user_meta_data->>'full_name', 'Sans nom')
  );
  
  RETURN NEW;
END;
$function$;