-- Add explicit policy to deny unauthenticated access to profiles table
-- This is a defense-in-depth measure to prevent any potential RLS bypass

CREATE POLICY "Deny unauthenticated access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- Add comment explaining the security architecture
COMMENT ON POLICY "Deny unauthenticated access to profiles" ON public.profiles IS 
'Explicit deny policy for unauthenticated users. This is a defense-in-depth measure.
All profile access requires authentication. Cross-user access must use get_public_profile() or get_user_phone() RPCs.';