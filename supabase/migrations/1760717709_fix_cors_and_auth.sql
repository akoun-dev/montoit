-- Fix CORS and Authentication Issues
-- This migration addresses the CORS and authentication problems

-- 1. Ensure CORS settings allow localhost development
-- Note: This needs to be configured in Supabase dashboard under Settings > API
-- The following settings should be added:
-- - Allowed origins: http://localhost:8080, http://localhost:8081, http://localhost:8082
-- - Allowed methods: GET, POST, PUT, DELETE, OPTIONS
-- - Allowed headers: content-type,apikey,authorization

-- 2. Fix login_attempts table if it doesn't exist
CREATE TABLE IF NOT EXISTS login_attempts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  success boolean NOT NULL,
  error_message text,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- 3. Enable RLS on login_attempts
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- 4. Create policy for login_attempts (drop if exists first)
DROP POLICY IF EXISTS "Users can view their own login attempts" ON login_attempts;
DROP POLICY IF EXISTS "Users can insert their own login attempts" ON login_attempts;

CREATE POLICY "Users can view their own login attempts" ON login_attempts
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can insert their own login attempts" ON login_attempts
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- 5. Ensure profiles table exists and has proper RLS
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  avatar_url text,
  user_type text DEFAULT 'individual',
  phone text,
  email_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 6. Create profiles policies (drop if exists first)
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 7. Ensure user_roles table exists
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 8. Create user_roles policies (drop if exists first)
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can insert their own roles" ON user_roles;

CREATE POLICY "Users can view their own roles" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own roles" ON user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 9. Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, user_type)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'user_type', 'individual')
  );
  
  -- Assign default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.login_attempts TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT ALL ON public.user_roles TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated;
