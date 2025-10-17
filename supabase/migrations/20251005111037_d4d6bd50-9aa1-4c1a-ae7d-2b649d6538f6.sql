-- Fix search_path in all SQL functions to prevent mutation warnings
-- This addresses critical security warnings from Supabase linter

-- Update has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Nouvel utilisateur'),
    COALESCE((NEW.raw_user_meta_data->>'user_type')::public.user_type, 'locataire')
  );
  
  -- Attribuer le rôle 'user' par défaut
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$function$;

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Update notify_new_message function
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Create notification for receiver
  INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
  VALUES (
    NEW.receiver_id,
    'new_message',
    'Nouveau message',
    LEFT(NEW.content, 100),
    '/messages',
    jsonb_build_object('message_id', NEW.id, 'sender_id', NEW.sender_id)
  );
  
  RETURN NEW;
END;
$function$;

-- Update update_profile_face_verified function
CREATE OR REPLACE FUNCTION public.update_profile_face_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.face_verification_status = 'verified' AND OLD.face_verification_status != 'verified' THEN
    UPDATE public.profiles
    SET face_verified = TRUE
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Update init_user_verifications function
CREATE OR REPLACE FUNCTION public.init_user_verifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insérer une ligne par défaut dans user_verifications
  INSERT INTO public.user_verifications (user_id, oneci_status, cnam_status)
  VALUES (NEW.id, 'pending', 'pending')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Update calculate_reputation_score function
CREATE OR REPLACE FUNCTION public.calculate_reputation_score(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  tenant_avg NUMERIC;
  tenant_count INTEGER;
  landlord_avg NUMERIC;
  landlord_count INTEGER;
  total_avg NUMERIC;
  total_count INTEGER;
BEGIN
  -- Calculer les stats en tant que locataire (avis reçus de propriétaires)
  SELECT 
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO tenant_avg, tenant_count
  FROM public.reviews
  WHERE reviewee_id = target_user_id 
    AND review_type = 'landlord_to_tenant';

  -- Calculer les stats en tant que propriétaire (avis reçus de locataires)
  SELECT 
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO landlord_avg, landlord_count
  FROM public.reviews
  WHERE reviewee_id = target_user_id 
    AND review_type = 'tenant_to_landlord';

  -- Calculer le total
  total_count := tenant_count + landlord_count;
  IF total_count > 0 THEN
    total_avg := (tenant_avg * tenant_count + landlord_avg * landlord_count) / total_count;
  ELSE
    total_avg := 0;
  END IF;

  -- Insérer ou mettre à jour le score
  INSERT INTO public.reputation_scores (
    user_id,
    overall_score,
    total_reviews,
    avg_rating,
    as_tenant_score,
    as_tenant_reviews,
    as_landlord_score,
    as_landlord_reviews
  )
  VALUES (
    target_user_id,
    total_avg,
    total_count,
    total_avg,
    tenant_avg,
    tenant_count,
    landlord_avg,
    landlord_count
  )
  ON CONFLICT (user_id) DO UPDATE SET
    overall_score = EXCLUDED.overall_score,
    total_reviews = EXCLUDED.total_reviews,
    avg_rating = EXCLUDED.avg_rating,
    as_tenant_score = EXCLUDED.as_tenant_score,
    as_tenant_reviews = EXCLUDED.as_tenant_reviews,
    as_landlord_score = EXCLUDED.as_landlord_score,
    as_landlord_reviews = EXCLUDED.as_landlord_reviews,
    updated_at = now();
END;
$function$;

-- Update update_reputation_on_review_change function
CREATE OR REPLACE FUNCTION public.update_reputation_on_review_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Pour INSERT et UPDATE, recalculer pour le reviewee
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    PERFORM public.calculate_reputation_score(NEW.reviewee_id);
  END IF;
  
  -- Pour DELETE, recalculer pour l'ancien reviewee
  IF (TG_OP = 'DELETE') THEN
    PERFORM public.calculate_reputation_score(OLD.reviewee_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Update cleanup_expired_recommendations function
CREATE OR REPLACE FUNCTION public.cleanup_expired_recommendations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.recommendation_cache
  WHERE expires_at < now();
END;
$function$;

-- Update update_updated_at_user_reminders function
CREATE OR REPLACE FUNCTION public.update_updated_at_user_reminders()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;