-- Créer un trigger pour initialiser automatiquement user_verifications lors de la création d'un profil
CREATE OR REPLACE FUNCTION public.init_user_verifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insérer une ligne par défaut dans user_verifications
  INSERT INTO public.user_verifications (user_id, oneci_status, cnam_status)
  VALUES (NEW.id, 'pending', 'pending')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger qui s'exécute après l'insertion d'un profil
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.init_user_verifications();