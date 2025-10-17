-- Fix security linter issues from EPIC 8 migration

-- 1. Fix: Security Definer View - Remove SECURITY DEFINER from view
-- Views cannot use SECURITY DEFINER, we'll use a function instead
DROP VIEW IF EXISTS public.mfa_metrics;

CREATE OR REPLACE FUNCTION public.get_mfa_metrics()
RETURNS TABLE (
  total_admins BIGINT,
  admins_with_2fa BIGINT,
  unused_backup_codes BIGINT,
  used_backup_codes BIGINT,
  percentage_with_2fa NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can view MFA metrics
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only administrators can view MFA metrics';
  END IF;
  
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT ur.user_id) FILTER (WHERE ur.role IN ('admin', 'super_admin')) as total_admins,
    COUNT(DISTINCT CASE 
      WHEN EXISTS (
        SELECT 1 FROM public.mfa_backup_codes mbc 
        WHERE mbc.user_id = ur.user_id
      ) THEN ur.user_id 
    END) as admins_with_2fa,
    COUNT(*) FILTER (WHERE mbc.used_at IS NULL) as unused_backup_codes,
    COUNT(*) FILTER (WHERE mbc.used_at IS NOT NULL) as used_backup_codes,
    ROUND(
      (COUNT(DISTINCT CASE 
        WHEN EXISTS (
          SELECT 1 FROM public.mfa_backup_codes mbc2 
          WHERE mbc2.user_id = ur.user_id
        ) THEN ur.user_id 
      END)::numeric / 
      NULLIF(COUNT(DISTINCT ur.user_id) FILTER (WHERE ur.role IN ('admin', 'super_admin')), 0)) * 100, 
    2) as percentage_with_2fa
  FROM public.user_roles ur
  LEFT JOIN public.mfa_backup_codes mbc ON ur.user_id = mbc.user_id
  WHERE ur.role IN ('admin', 'super_admin');
END;
$$;

COMMENT ON FUNCTION public.get_mfa_metrics() IS 
'Provides statistics on 2FA adoption among administrators (admin-only access)';