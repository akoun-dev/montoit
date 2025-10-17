-- Remove profiles_public view entirely
-- All access to public profile data MUST go through get_public_profile() RPC
-- which already excludes phone numbers and provides proper security

DROP VIEW IF EXISTS public.profiles_public CASCADE;

-- Update comment on get_public_profile function to clarify it replaces the view
COMMENT ON FUNCTION public.get_public_profile(uuid) IS 
'RPC function to securely access public profile data WITHOUT phone numbers. 
This replaces the deprecated profiles_public view.
Phone access must go through get_user_phone() RPC which logs all access attempts.
See docs/CONTACT_INFO_PROTECTION.md for complete security architecture.';