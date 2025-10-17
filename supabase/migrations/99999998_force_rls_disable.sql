-- FORCE RLS DISABLE - Migration de développement forcé
-- ATTENTION: Cette migration désactive TOUTES les restrictions RLS

-- Désactiver RLS sur TOUTES les tables
ALTER TABLE IF EXISTS public.login_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rental_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.leases DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les policies existantes et en créer de nouvelles permissives
DROP POLICY IF EXISTS "Users can insert their own login attempts" ON public.login_attempts;
DROP POLICY IF EXISTS "Users can view their own login attempts" ON public.login_attempts;
CREATE POLICY "Dev allow all login_attempts" ON public.login_attempts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Dev allow all profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;
CREATE POLICY "Dev allow all user_roles" ON public.user_roles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view properties" ON public.properties;
DROP POLICY IF EXISTS "Users can create properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update their properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete their properties" ON public.properties;
CREATE POLICY "Dev allow all properties" ON public.properties FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view rental applications" ON public.rental_applications;
DROP POLICY IF EXISTS "Users can create rental applications" ON public.rental_applications;
DROP POLICY IF EXISTS "Users can update their rental applications" ON public.rental_applications;
DROP POLICY IF EXISTS "Users can delete their rental applications" ON public.rental_applications;
CREATE POLICY "Dev allow all rental_applications" ON public.rental_applications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view leases" ON public.leases;
DROP POLICY IF EXISTS "Users can create leases" ON public.leases;
DROP POLICY IF EXISTS "Users can update their leases" ON public.leases;
DROP POLICY IF EXISTS "Users can delete their leases" ON public.leases;
CREATE POLICY "Dev allow all leases" ON public.leases FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update their reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can delete their reviews" ON public.reviews;
CREATE POLICY "Dev allow all reviews" ON public.reviews FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view messages" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their messages" ON public.messages;
CREATE POLICY "Dev allow all messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);

-- Donner TOUS les droits TOUS les utilisateurs
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, public;

-- Supprimer les triggers qui pourraient bloquer
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Créer une fonction de développement pour ignorer les restrictions
CREATE OR REPLACE FUNCTION public.dev_bypass_rls()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cette fonction retourne toujours true pour le développement
  RETURN true;
END;
$$;

-- Créer une table de configuration de développement
CREATE TABLE IF NOT EXISTS public.dev_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insérer les paramètres de développement
INSERT INTO public.dev_settings (setting_key, setting_value) VALUES
  ('rls_disabled', 'true'),
  ('cors_mode', 'development'),
  ('auth_bypass', 'true')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = NOW();

COMMENT ON TABLE public.dev_settings IS 'Configuration pour le mode développement';
COMMENT ON COLUMN public.dev_settings.setting_key IS 'Clé de configuration';
COMMENT ON COLUMN public.dev_settings.setting_value IS 'Valeur de configuration';