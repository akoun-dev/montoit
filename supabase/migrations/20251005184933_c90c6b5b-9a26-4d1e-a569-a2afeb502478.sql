-- Corriger le warning de sécurité sur la vue profiles_public
-- La vue doit utiliser security_invoker = true pour respecter les RLS policies
ALTER VIEW public.profiles_public SET (security_invoker = true);