-- Corriger les vues pour utiliser SECURITY INVOKER au lieu de SECURITY DEFINER
-- Cela garantit que les vues respectent les RLS policies de l'utilisateur qui les interroge

-- 1. Recréer profiles_public avec SECURITY INVOKER
DROP VIEW IF EXISTS public.profiles_public CASCADE;
CREATE VIEW public.profiles_public 
WITH (security_invoker=on)
AS
SELECT 
  id, full_name, user_type, city, bio, avatar_url,
  oneci_verified, cnam_verified, face_verified, is_verified,
  created_at, updated_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated, anon;

-- 2. Recréer sensitive_data_access_monitoring avec SECURITY INVOKER  
DROP VIEW IF EXISTS public.sensitive_data_access_monitoring CASCADE;
CREATE VIEW public.sensitive_data_access_monitoring
WITH (security_invoker=on)
AS
SELECT 
  sdal.id, sdal.requester_id, pr.full_name as requester_name,
  sdal.target_user_id, pt.full_name as target_name,
  sdal.data_type, sdal.access_granted, sdal.relationship_type,
  sdal.metadata, sdal.accessed_at,
  CASE 
    WHEN sdal.metadata->>'has_2fa' = 'true' THEN '✓ 2FA'
    WHEN sdal.metadata->>'has_2fa' = 'false' THEN '✗ NO 2FA'
    ELSE 'N/A'
  END as mfa_status
FROM public.sensitive_data_access_log sdal
LEFT JOIN public.profiles pr ON pr.id = sdal.requester_id
LEFT JOIN public.profiles pt ON pt.id = sdal.target_user_id
ORDER BY sdal.accessed_at DESC;

GRANT SELECT ON public.sensitive_data_access_monitoring TO authenticated;