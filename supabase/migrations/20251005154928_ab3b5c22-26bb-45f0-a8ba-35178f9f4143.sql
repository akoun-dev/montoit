-- Table pour tracer les tentatives de connexion admin
CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour optimiser les requêtes de détection
CREATE INDEX idx_admin_login_attempts_email_created ON public.admin_login_attempts(email, created_at DESC);
CREATE INDEX idx_admin_login_attempts_success_created ON public.admin_login_attempts(success, created_at DESC);

-- RLS pour admin_login_attempts
ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view login attempts"
  ON public.admin_login_attempts
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert login attempts"
  ON public.admin_login_attempts
  FOR INSERT
  WITH CHECK (true);

-- Fonction pour détecter les actions massives (>10 actions en <5 minutes)
CREATE OR REPLACE FUNCTION public.detect_mass_actions()
RETURNS TABLE (
  admin_id UUID,
  action_count BIGINT,
  time_window_start TIMESTAMPTZ,
  time_window_end TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aal.admin_id,
    COUNT(*) as action_count,
    MIN(aal.created_at) as time_window_start,
    MAX(aal.created_at) as time_window_end
  FROM public.admin_audit_logs aal
  WHERE 
    aal.created_at > now() - interval '5 minutes'
    AND aal.action_type NOT IN ('login', 'logout') -- Exclure actions automatiques
  GROUP BY aal.admin_id
  HAVING COUNT(*) > 10
  ORDER BY action_count DESC;
END;
$$;

-- Fonction pour obtenir les tentatives échouées récentes
CREATE OR REPLACE FUNCTION public.get_failed_login_attempts(hours_ago INTEGER DEFAULT 24)
RETURNS TABLE (
  email TEXT,
  attempt_count BIGINT,
  last_attempt TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ala.email,
    COUNT(*) as attempt_count,
    MAX(ala.created_at) as last_attempt
  FROM public.admin_login_attempts ala
  WHERE 
    ala.success = false
    AND ala.created_at > now() - make_interval(hours => hours_ago)
  GROUP BY ala.email
  ORDER BY attempt_count DESC;
END;
$$;