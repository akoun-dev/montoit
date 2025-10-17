-- ============================================
-- Workflow de validation admin pour vérifications d'identité
-- ============================================

-- 1. Ajouter les colonnes de review admin dans user_verifications
ALTER TABLE public.user_verifications
ADD COLUMN IF NOT EXISTS admin_reviewed_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS admin_review_notes text,
ADD COLUMN IF NOT EXISTS admin_reviewed_at timestamp with time zone;

-- 2. Créer fonction pour approuver une vérification (ONECI ou CNAM)
CREATE OR REPLACE FUNCTION public.approve_verification(
  p_user_id uuid,
  p_verification_type text,
  p_review_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que l'appelant est admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Seuls les administrateurs peuvent approuver des vérifications';
  END IF;

  -- Mettre à jour le statut de vérification
  IF p_verification_type = 'oneci' THEN
    UPDATE public.user_verifications
    SET 
      oneci_status = 'verified',
      admin_reviewed_by = auth.uid(),
      admin_review_notes = p_review_notes,
      admin_reviewed_at = now(),
      updated_at = now()
    WHERE user_id = p_user_id;
    
    -- Mettre à jour le profil
    UPDATE public.profiles
    SET oneci_verified = true
    WHERE id = p_user_id;
    
  ELSIF p_verification_type = 'cnam' THEN
    UPDATE public.user_verifications
    SET 
      cnam_status = 'verified',
      admin_reviewed_by = auth.uid(),
      admin_review_notes = p_review_notes,
      admin_reviewed_at = now(),
      updated_at = now()
    WHERE user_id = p_user_id;
    
    -- Mettre à jour le profil
    UPDATE public.profiles
    SET cnam_verified = true
    WHERE id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Type de vérification invalide: %', p_verification_type;
  END IF;

  -- Créer notification pour l'utilisateur
  INSERT INTO public.notifications (
    user_id,
    type,
    category,
    title,
    message,
    link,
    metadata
  ) VALUES (
    p_user_id,
    'verification_approved',
    'verification',
    'Vérification approuvée',
    'Votre vérification ' || UPPER(p_verification_type) || ' a été approuvée par un administrateur.',
    '/verification',
    jsonb_build_object(
      'verification_type', p_verification_type,
      'reviewed_by', auth.uid(),
      'reviewed_at', now()
    )
  );

  -- Logger l'action admin
  INSERT INTO public.admin_audit_logs (
    admin_id,
    action_type,
    target_type,
    target_id,
    new_values,
    notes
  ) VALUES (
    auth.uid(),
    'verification_approved',
    'user_verification',
    p_user_id,
    jsonb_build_object('verification_type', p_verification_type, 'status', 'verified'),
    p_review_notes
  );
END;
$$;

-- 3. Créer fonction pour rejeter une vérification
CREATE OR REPLACE FUNCTION public.reject_verification(
  p_user_id uuid,
  p_verification_type text,
  p_review_notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que l'appelant est admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Seuls les administrateurs peuvent rejeter des vérifications';
  END IF;

  -- Vérifier que des notes sont fournies
  IF p_review_notes IS NULL OR p_review_notes = '' THEN
    RAISE EXCEPTION 'Les notes de rejet sont obligatoires';
  END IF;

  -- Mettre à jour le statut de vérification
  IF p_verification_type = 'oneci' THEN
    UPDATE public.user_verifications
    SET 
      oneci_status = 'rejected',
      admin_reviewed_by = auth.uid(),
      admin_review_notes = p_review_notes,
      admin_reviewed_at = now(),
      updated_at = now()
    WHERE user_id = p_user_id;
    
  ELSIF p_verification_type = 'cnam' THEN
    UPDATE public.user_verifications
    SET 
      cnam_status = 'rejected',
      admin_reviewed_by = auth.uid(),
      admin_review_notes = p_review_notes,
      admin_reviewed_at = now(),
      updated_at = now()
    WHERE user_id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Type de vérification invalide: %', p_verification_type;
  END IF;

  -- Créer notification pour l'utilisateur
  INSERT INTO public.notifications (
    user_id,
    type,
    category,
    title,
    message,
    link,
    metadata
  ) VALUES (
    p_user_id,
    'verification_rejected',
    'verification',
    'Vérification rejetée',
    'Votre vérification ' || UPPER(p_verification_type) || ' a été rejetée. Motif: ' || p_review_notes,
    '/verification',
    jsonb_build_object(
      'verification_type', p_verification_type,
      'reviewed_by', auth.uid(),
      'reviewed_at', now(),
      'rejection_reason', p_review_notes
    )
  );

  -- Logger l'action admin
  INSERT INTO public.admin_audit_logs (
    admin_id,
    action_type,
    target_type,
    target_id,
    new_values,
    notes
  ) VALUES (
    auth.uid(),
    'verification_rejected',
    'user_verification',
    p_user_id,
    jsonb_build_object('verification_type', p_verification_type, 'status', 'rejected'),
    p_review_notes
  );
END;
$$;

-- 4. Mettre à jour les RLS policies pour permettre aux admins de voir toutes les vérifications
DROP POLICY IF EXISTS "Admins can view all verifications" ON public.user_verifications;

CREATE POLICY "Admins can view all verifications"
ON public.user_verifications
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id
);