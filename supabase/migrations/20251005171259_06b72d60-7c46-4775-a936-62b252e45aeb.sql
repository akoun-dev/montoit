-- Tâche 3 & 4 : Suite de la migration - PARTIE 2

-- 1. Créer table de gestion des tiers de confiance
CREATE TABLE IF NOT EXISTS public.trusted_third_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  organization_name text NOT NULL,
  license_number text,
  specialization text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. RLS policies pour trusted_third_parties
ALTER TABLE public.trusted_third_parties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tiers peuvent voir leur propre profil"
  ON public.trusted_third_parties FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins peuvent gérer les tiers"
  ON public.trusted_third_parties FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- 3. Fonction helper pour vérifier si user est tiers de confiance
CREATE OR REPLACE FUNCTION public.is_trusted_third_party(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'tiers_de_confiance'
  ) AND EXISTS (
    SELECT 1 FROM public.trusted_third_parties
    WHERE user_id = _user_id AND is_active = true
  );
$$;

-- 4. Ajouter colonnes de modération aux propriétés
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS moderation_status text DEFAULT 'pending' 
CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'changes_requested'));

ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS moderation_notes text,
ADD COLUMN IF NOT EXISTS moderated_by uuid,
ADD COLUMN IF NOT EXISTS moderated_at timestamptz;

-- 5. Modifier RLS: propriétés visibles au public uniquement si approuvées
DROP POLICY IF EXISTS "Propriétés publiquement visibles" ON public.properties;

CREATE POLICY "Propriétés approuvées publiquement visibles"
  ON public.properties FOR SELECT
  USING (
    moderation_status = 'approved' 
    OR auth.uid() = owner_id 
    OR has_role(auth.uid(), 'admin')
  );

-- 6. Trigger notification propriétaire après modération
CREATE OR REPLACE FUNCTION public.notify_property_moderation()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.moderation_status IS DISTINCT FROM NEW.moderation_status THEN
    INSERT INTO public.notifications (user_id, type, category, title, message, link, metadata)
    VALUES (
      NEW.owner_id,
      CASE NEW.moderation_status
        WHEN 'approved' THEN 'property_approved'
        WHEN 'rejected' THEN 'property_rejected'
        WHEN 'changes_requested' THEN 'property_changes_requested'
      END,
      'property',
      CASE NEW.moderation_status
        WHEN 'approved' THEN 'Annonce approuvée'
        WHEN 'rejected' THEN 'Annonce rejetée'
        WHEN 'changes_requested' THEN 'Modifications demandées'
      END,
      COALESCE(NEW.moderation_notes, 'Votre annonce a été ' || NEW.moderation_status),
      '/my-properties',
      jsonb_build_object('property_id', NEW.id, 'moderation_status', NEW.moderation_status)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER property_moderation_trigger
  AFTER UPDATE ON public.properties
  FOR EACH ROW
  WHEN (OLD.moderation_status IS DISTINCT FROM NEW.moderation_status)
  EXECUTE FUNCTION public.notify_property_moderation();

-- 7. Créer trigger pour updated_at sur trusted_third_parties
CREATE TRIGGER update_trusted_third_parties_updated_at
  BEFORE UPDATE ON public.trusted_third_parties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();