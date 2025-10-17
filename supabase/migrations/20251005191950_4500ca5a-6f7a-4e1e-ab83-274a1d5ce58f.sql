-- Remove overly permissive RLS policies that expose phone numbers
-- All cross-user profile access MUST now go through get_public_profile() RPC

-- Drop the policies that allow direct SELECT on profiles table
DROP POLICY IF EXISTS "Applicants can view landlord public profiles" ON public.profiles;
DROP POLICY IF EXISTS "Landlords can view applicant public profiles" ON public.profiles;
DROP POLICY IF EXISTS "Lease parties can view each other public profiles" ON public.profiles;

-- The remaining policies are:
-- 1. "Users can view their own complete profile" - allows auth.uid() = id
-- 2. "Admins can view all profiles" - allows has_role(auth.uid(), 'admin')
-- 3. Users can update their own profile
-- 4. Auto-creation policy

-- Now landlords/applicants/lease parties MUST use:
-- - get_public_profile(user_id) RPC for non-sensitive data
-- - get_user_phone(user_id) RPC for phone (with logging)

COMMENT ON TABLE public.profiles IS 
'User profiles table with RLS protection. 
Direct SELECT is restricted to: (1) users viewing their own profile, (2) admins.
Cross-user access MUST use get_public_profile() RPC (no phone) or get_user_phone() RPC (logged access).
See docs/CONTACT_INFO_PROTECTION.md for complete security architecture.';