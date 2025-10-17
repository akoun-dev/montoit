-- Migration des rôles admin vers user_roles
-- Insérer les admins existants dans user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM public.profiles
WHERE user_type = 'admin_ansut'
ON CONFLICT (user_id, role) DO NOTHING;

-- Créer fonction pour empêcher admin_ansut dans user_type
CREATE OR REPLACE FUNCTION public.prevent_admin_in_user_type()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_type::text = 'admin_ansut' THEN
    RAISE EXCEPTION 'Les rôles admin doivent être gérés via la table user_roles';
  END IF;
  RETURN NEW;
END;
$$;

-- Créer trigger pour bloquer admin_ansut
DROP TRIGGER IF EXISTS enforce_admin_roles ON public.profiles;
CREATE TRIGGER enforce_admin_roles
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_admin_in_user_type();