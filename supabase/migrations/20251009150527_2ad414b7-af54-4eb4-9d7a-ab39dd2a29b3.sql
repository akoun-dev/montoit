-- Table pour stocker les messages des invités (utilisateurs non connectés)
CREATE TABLE public.guest_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID NOT NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  message_content TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  browser_fingerprint TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'replied', 'spam', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes pour performance et détection spam
CREATE INDEX idx_guest_messages_property ON public.guest_messages(property_id);
CREATE INDEX idx_guest_messages_owner ON public.guest_messages(owner_id);
CREATE INDEX idx_guest_messages_email ON public.guest_messages(guest_email);
CREATE INDEX idx_guest_messages_ip ON public.guest_messages(ip_address);
CREATE INDEX idx_guest_messages_created ON public.guest_messages(created_at);
CREATE INDEX idx_guest_messages_fingerprint ON public.guest_messages(browser_fingerprint);

-- RLS Policies
ALTER TABLE public.guest_messages ENABLE ROW LEVEL SECURITY;

-- Propriétaires peuvent voir leurs messages invités
CREATE POLICY "Owners can view their guest messages"
ON public.guest_messages
FOR SELECT
USING (auth.uid() = owner_id);

-- Propriétaires peuvent mettre à jour le statut (marquer comme spam, etc.)
CREATE POLICY "Owners can update their guest messages"
ON public.guest_messages
FOR UPDATE
USING (auth.uid() = owner_id);

-- Admins peuvent voir tous les messages
CREATE POLICY "Admins can view all guest messages"
ON public.guest_messages
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fonction de vérification du rate limiting pour invités
CREATE OR REPLACE FUNCTION public.check_guest_rate_limit(
  _ip TEXT,
  _email TEXT,
  _fingerprint TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ip_count INT;
  email_count INT;
  fingerprint_count INT;
  is_blocked BOOLEAN;
BEGIN
  -- Vérifier si l'IP est bloquée
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_ips
    WHERE ip_address = _ip
      AND (blocked_until IS NULL OR blocked_until > NOW())
  ) INTO is_blocked;
  
  IF is_blocked THEN
    RETURN jsonb_build_object(
      'allowed', false, 
      'reason', 'IP bloquée pour activité suspecte'
    );
  END IF;
  
  -- Compter messages récents (1h) par IP - limite: 3 messages/heure
  SELECT COUNT(*) INTO ip_count
  FROM public.guest_messages
  WHERE ip_address = _ip 
    AND created_at > NOW() - INTERVAL '1 hour';
  
  IF ip_count >= 3 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Trop de messages depuis cette adresse IP. Réessayez dans 1 heure.',
      'retry_after', NOW() + INTERVAL '1 hour'
    );
  END IF;
  
  -- Compter messages récents (24h) par email - limite: 5 messages/jour
  SELECT COUNT(*) INTO email_count
  FROM public.guest_messages
  WHERE guest_email = _email 
    AND created_at > NOW() - INTERVAL '24 hours';
  
  IF email_count >= 5 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Trop de messages depuis cet email. Réessayez demain.',
      'retry_after', NOW() + INTERVAL '24 hours'
    );
  END IF;
  
  -- Vérifier fingerprint (détection multi-comptes) - limite: 5 messages/heure
  IF _fingerprint IS NOT NULL THEN
    SELECT COUNT(*) INTO fingerprint_count
    FROM public.guest_messages
    WHERE browser_fingerprint = _fingerprint 
      AND created_at > NOW() - INTERVAL '1 hour';
    
    IF fingerprint_count >= 5 THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'Activité suspecte détectée. Réessayez plus tard.',
        'retry_after', NOW() + INTERVAL '1 hour'
      );
    END IF;
  END IF;
  
  -- Tout est OK
  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- Fonction de nettoyage automatique (90 jours)
CREATE OR REPLACE FUNCTION public.cleanup_old_guest_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.guest_messages
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  RAISE NOTICE 'Cleaned up guest messages older than 90 days';
END;
$$;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_guest_message_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_guest_messages_updated_at
BEFORE UPDATE ON public.guest_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_guest_message_updated_at();