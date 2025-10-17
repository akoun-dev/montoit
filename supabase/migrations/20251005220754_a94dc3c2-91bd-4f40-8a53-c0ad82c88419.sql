-- ================================================
-- EPIC 9: Rate Limiting et Protection DDoS (corrigé)
-- ================================================

-- 1. Étendre admin_login_attempts → login_attempts
ALTER TABLE IF EXISTS public.admin_login_attempts RENAME TO login_attempts;

-- Ajouter colonnes pour le rate limiting
ALTER TABLE public.login_attempts 
  ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fingerprint TEXT;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time 
  ON public.login_attempts(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time 
  ON public.login_attempts(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_blocked 
  ON public.login_attempts(blocked_until);

-- 2. Créer table api_rate_limits
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Créer index unique composite
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_rate_limits_unique
  ON public.api_rate_limits(endpoint, COALESCE(user_id::text, ''), COALESCE(ip_address, ''), window_start);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_lookup 
  ON public.api_rate_limits(endpoint, user_id, ip_address, window_start DESC);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window 
  ON public.api_rate_limits(window_start);

-- RLS pour api_rate_limits
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage rate limits"
  ON public.api_rate_limits FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. Créer table blocked_ips
CREATE TABLE IF NOT EXISTS public.blocked_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  blocked_until TIMESTAMPTZ,
  blocked_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour performance (sans prédicat)
CREATE INDEX IF NOT EXISTS idx_blocked_ips_active 
  ON public.blocked_ips(ip_address, blocked_until);

-- RLS pour blocked_ips
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view blocked IPs"
  ON public.blocked_ips FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage blocked IPs"
  ON public.blocked_ips FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. Fonction check_login_rate_limit
CREATE OR REPLACE FUNCTION public.check_login_rate_limit(
  _email TEXT,
  _ip_address TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _failed_attempts_email INTEGER;
  _failed_attempts_ip INTEGER;
  _total_attempts_ip INTEGER;
  _is_blocked BOOLEAN;
  _blocked_until TIMESTAMPTZ;
BEGIN
  -- Vérifier si IP est bloquée
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_ips
    WHERE ip_address = _ip_address
      AND (blocked_until IS NULL OR blocked_until > now())
  ) INTO _is_blocked;

  IF _is_blocked THEN
    SELECT blocked_until INTO _blocked_until
    FROM public.blocked_ips
    WHERE ip_address = _ip_address
      AND (blocked_until IS NULL OR blocked_until > now())
    LIMIT 1;

    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'IP bloquée pour activité suspecte',
      'retry_after', _blocked_until,
      'blocked', true
    );
  END IF;

  -- Compter échecs par email (15 dernières minutes)
  SELECT COUNT(*) INTO _failed_attempts_email
  FROM public.login_attempts
  WHERE email = _email
    AND success = false
    AND created_at > now() - INTERVAL '15 minutes';

  -- Compter échecs par IP (15 dernières minutes)
  SELECT COUNT(*) INTO _failed_attempts_ip
  FROM public.login_attempts
  WHERE ip_address = _ip_address
    AND success = false
    AND created_at > now() - INTERVAL '15 minutes';

  -- Compter total tentatives IP (5 dernières minutes) pour détection DDoS
  SELECT COUNT(*) INTO _total_attempts_ip
  FROM public.login_attempts
  WHERE ip_address = _ip_address
    AND created_at > now() - INTERVAL '5 minutes';

  -- Limite par email : 5 tentatives / 15 min
  IF _failed_attempts_email >= 5 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Trop de tentatives échouées pour cet email. Réessayez dans 15 minutes.',
      'retry_after', now() + INTERVAL '15 minutes',
      'show_captcha', true,
      'failed_count', _failed_attempts_email
    );
  END IF;

  -- Limite par IP : 10 tentatives / 15 min
  IF _failed_attempts_ip >= 10 THEN
    -- Bloquer l'IP automatiquement
    INSERT INTO public.blocked_ips (ip_address, reason, blocked_until, notes)
    VALUES (
      _ip_address,
      'rate_limit_exceeded',
      now() + INTERVAL '1 hour',
      'Blocage automatique: ' || _failed_attempts_ip || ' échecs en 15 minutes'
    )
    ON CONFLICT (ip_address) DO UPDATE
    SET blocked_until = now() + INTERVAL '1 hour',
        notes = 'Blocage automatique renouvelé: ' || _failed_attempts_ip || ' échecs';

    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'IP bloquée pour 1 heure suite à trop de tentatives échouées',
      'retry_after', now() + INTERVAL '1 hour',
      'blocked', true
    );
  END IF;

  -- Détection pattern DDoS : 50 tentatives / 5 min
  IF _total_attempts_ip >= 50 THEN
    -- Bloquer l'IP et alerter
    INSERT INTO public.blocked_ips (ip_address, reason, blocked_until, notes)
    VALUES (
      _ip_address,
      'ddos_detected',
      now() + INTERVAL '24 hours',
      'Pattern DDoS détecté: ' || _total_attempts_ip || ' tentatives en 5 minutes'
    )
    ON CONFLICT (ip_address) DO UPDATE
    SET blocked_until = now() + INTERVAL '24 hours',
        reason = 'ddos_detected',
        notes = 'Pattern DDoS détecté: ' || _total_attempts_ip || ' tentatives';

    -- Logger l'alerte
    INSERT INTO public.admin_audit_logs (
      admin_id, action_type, target_type, target_id, notes
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      'ddos_detected',
      'ip_address',
      '00000000-0000-0000-0000-000000000000'::uuid,
      'IP ' || _ip_address || ': ' || _total_attempts_ip || ' tentatives en 5 minutes'
    );

    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Activité anormale détectée. Votre IP a été bloquée.',
      'retry_after', now() + INTERVAL '24 hours',
      'blocked', true
    );
  END IF;

  -- Montrer CAPTCHA après 3 échecs
  IF _failed_attempts_email >= 3 THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'show_captcha', true,
      'failed_count', _failed_attempts_email
    );
  END IF;

  -- Tout est OK
  RETURN jsonb_build_object(
    'allowed', true,
    'show_captcha', false,
    'failed_count', _failed_attempts_email
  );
END;
$$;

-- 5. Fonction check_api_rate_limit
CREATE OR REPLACE FUNCTION public.check_api_rate_limit(
  _endpoint TEXT,
  _user_id UUID,
  _ip_address TEXT,
  _max_requests INTEGER,
  _window_minutes INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_count INTEGER;
  _window_start TIMESTAMPTZ;
BEGIN
  _window_start := date_trunc('minute', now());

  -- Vérifier si IP est bloquée
  IF EXISTS (
    SELECT 1 FROM public.blocked_ips
    WHERE ip_address = _ip_address
      AND (blocked_until IS NULL OR blocked_until > now())
  ) THEN
    RETURN false;
  END IF;

  -- Compter requêtes dans la fenêtre
  SELECT COALESCE(SUM(request_count), 0) INTO _current_count
  FROM public.api_rate_limits
  WHERE endpoint = _endpoint
    AND (user_id = _user_id OR (_user_id IS NULL AND ip_address = _ip_address))
    AND window_start > now() - (_window_minutes || ' minutes')::INTERVAL;

  -- Si limite dépassée
  IF _current_count >= _max_requests THEN
    RETURN false;
  END IF;

  -- Incrémenter le compteur
  INSERT INTO public.api_rate_limits (
    endpoint, user_id, ip_address, request_count, window_start
  )
  VALUES (
    _endpoint, _user_id, _ip_address, 1, _window_start
  )
  ON CONFLICT ON CONSTRAINT idx_api_rate_limits_unique
  DO UPDATE SET request_count = api_rate_limits.request_count + 1;

  RETURN true;
END;
$$;

-- 6. Fonction detect_ddos_pattern
CREATE OR REPLACE FUNCTION public.detect_ddos_pattern()
RETURNS TABLE(
  ip_address TEXT,
  request_count BIGINT,
  time_window TEXT,
  endpoints_targeted TEXT[],
  first_request TIMESTAMPTZ,
  last_request TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que l'appelant est admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can detect DDoS patterns';
  END IF;

  -- Détecter patterns suspects (plus de 100 requêtes/minute)
  RETURN QUERY
  SELECT 
    rl.ip_address,
    SUM(rl.request_count) as request_count,
    '1 minute' as time_window,
    array_agg(DISTINCT rl.endpoint) as endpoints_targeted,
    MIN(rl.created_at) as first_request,
    MAX(rl.created_at) as last_request
  FROM public.api_rate_limits rl
  WHERE rl.created_at > now() - INTERVAL '5 minutes'
    AND rl.ip_address IS NOT NULL
  GROUP BY rl.ip_address
  HAVING SUM(rl.request_count) > 100
  ORDER BY request_count DESC;
END;
$$;

-- 7. Fonction block_ip
CREATE OR REPLACE FUNCTION public.block_ip(
  _ip_address TEXT,
  _reason TEXT,
  _duration_hours INTEGER DEFAULT NULL,
  _notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _blocked_id UUID;
BEGIN
  -- Vérifier que l'appelant est admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can block IPs';
  END IF;

  INSERT INTO public.blocked_ips (
    ip_address,
    reason,
    blocked_until,
    blocked_by,
    notes
  )
  VALUES (
    _ip_address,
    _reason,
    CASE WHEN _duration_hours IS NOT NULL 
      THEN now() + (_duration_hours || ' hours')::INTERVAL 
      ELSE NULL 
    END,
    auth.uid(),
    _notes
  )
  ON CONFLICT (ip_address) DO UPDATE
  SET blocked_until = CASE WHEN _duration_hours IS NOT NULL 
                        THEN now() + (_duration_hours || ' hours')::INTERVAL 
                        ELSE NULL 
                      END,
      reason = _reason,
      blocked_by = auth.uid(),
      notes = _notes,
      blocked_at = now()
  RETURNING id INTO _blocked_id;

  -- Logger l'action
  INSERT INTO public.admin_audit_logs (
    admin_id, action_type, target_type, target_id, notes
  ) VALUES (
    auth.uid(),
    'ip_blocked',
    'blocked_ip',
    _blocked_id,
    'Blocked IP: ' || _ip_address || ' - Reason: ' || _reason
  );

  RETURN _blocked_id;
END;
$$;

-- 8. Fonction unblock_ip
CREATE OR REPLACE FUNCTION public.unblock_ip(_ip_address TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que l'appelant est admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can unblock IPs';
  END IF;

  DELETE FROM public.blocked_ips WHERE ip_address = _ip_address;

  -- Logger l'action
  INSERT INTO public.admin_audit_logs (
    admin_id, action_type, target_type, notes
  ) VALUES (
    auth.uid(),
    'ip_unblocked',
    'blocked_ip',
    'Unblocked IP: ' || _ip_address
  );

  RETURN true;
END;
$$;

-- 9. Fonction de nettoyage automatique
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Nettoyer les rate limits de plus de 1 heure
  DELETE FROM public.api_rate_limits
  WHERE created_at < now() - INTERVAL '1 hour';

  -- Nettoyer les tentatives de login de plus de 24h
  DELETE FROM public.login_attempts
  WHERE created_at < now() - INTERVAL '24 hours';

  -- Débloquer les IPs expirées
  DELETE FROM public.blocked_ips
  WHERE blocked_until IS NOT NULL AND blocked_until < now();
END;
$$;