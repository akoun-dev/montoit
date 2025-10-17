-- Migration pour le développement - Désactiver temporairement RLS sur login_attempts
ALTER TABLE public.login_attempts DISABLE ROW LEVEL SECURITY;

-- Créer une policy permissive pour login_attempts pendant le développement
DROP POLICY IF EXISTS "Dev allow all login_attempts" ON public.login_attempts;
CREATE POLICY "Dev allow all login_attempts"
ON public.login_attempts FOR ALL
USING (true) WITH CHECK (true);

-- Donner tous les droits sur login_attempts pour le développement
GRANT ALL ON public.login_attempts TO anon, authenticated;

-- Désactiver RLS sur les tables critiques pour le développement
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Policies permissives pour le développement
DROP POLICY IF EXISTS "Dev allow all profiles" ON public.profiles;
CREATE POLICY "Dev allow all profiles"
ON public.profiles FOR ALL
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Dev allow all user_roles" ON public.user_roles;
CREATE POLICY "Dev allow all user_roles"
ON public.user_roles FOR ALL
USING (true) WITH CHECK (true);

-- Donner tous les droits pour le développement
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT ALL ON public.user_roles TO anon, authenticated;

-- Créer un utilisateur de développement avec service role si nécessaire
-- (Cette partie peut être décommentée si nécessaire)
/*
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dev_user') THEN
    CREATE ROLE dev_user WITH LOGIN PASSWORD 'dev123';
    GRANT ALL ON ALL TABLES IN SCHEMA public TO dev_user;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO dev_user;
  END IF;
END $$;
*/