-- Fix profiles table RLS policies to prevent unauthorized access to personal information
-- 
-- Issue: The "Block unauthenticated profile access" policy has contradictory logic
-- that doesn't actually block anything (auth.uid() IS NOT NULL AND false = always false)
--
-- Solution: Drop the problematic policy. The existing SELECT policies already provide
-- proper protection:
-- - Users can only view their own profile
-- - Admins can view all profiles
-- - No one else can view profiles (no other SELECT policy exists)

-- Drop the contradictory ALL policy
DROP POLICY IF EXISTS "Block unauthenticated profile access" ON public.profiles;

-- Add a comment to document the security model
COMMENT ON TABLE public.profiles IS 
'User profile information including sensitive data like phone numbers.
Access is restricted by RLS:
- Users can SELECT/UPDATE only their own profile
- Admins can SELECT all profiles
- Public access to non-sensitive profile data should use get_public_profile() RPC
- Phone number access should use get_user_phone() RPC with relationship checks';

-- Ensure the existing policies are correctly restrictive
-- These should already exist, but we verify them here for clarity

-- Verify SELECT policy for users (own profile only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can view their own complete profile'
  ) THEN
    CREATE POLICY "Users can view their own complete profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);
  END IF;
END $$;

-- Verify SELECT policy for admins (all profiles)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Admins can view all profiles'
  ) THEN
    CREATE POLICY "Admins can view all profiles"
    ON public.profiles
    FOR SELECT
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;