-- Créer la table des avis
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  review_type TEXT NOT NULL CHECK (review_type IN ('tenant_to_landlord', 'landlord_to_tenant')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT no_self_review CHECK (reviewer_id != reviewee_id),
  CONSTRAINT unique_review_per_lease UNIQUE (reviewer_id, reviewee_id, lease_id)
);

-- Créer la table des scores de réputation
CREATE TABLE IF NOT EXISTS public.reputation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_score NUMERIC(3,2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  avg_rating NUMERIC(3,2) DEFAULT 0.00,
  as_tenant_score NUMERIC(3,2) DEFAULT 0.00,
  as_tenant_reviews INTEGER DEFAULT 0,
  as_landlord_score NUMERIC(3,2) DEFAULT 0.00,
  as_landlord_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reputation_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour reviews
CREATE POLICY "Users can view reviews about them or by them"
  ON public.reviews FOR SELECT
  USING (auth.uid() = reviewer_id OR auth.uid() = reviewee_id OR TRUE);

CREATE POLICY "Users can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update their own reviews"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = reviewer_id);

CREATE POLICY "Users can delete their own reviews"
  ON public.reviews FOR DELETE
  USING (auth.uid() = reviewer_id);

-- RLS Policies pour reputation_scores (visible par tous)
CREATE POLICY "Everyone can view reputation scores"
  ON public.reputation_scores FOR SELECT
  USING (TRUE);

-- Fonction pour calculer et mettre à jour le score de réputation
CREATE OR REPLACE FUNCTION public.calculate_reputation_score(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Fonction trigger pour recalculer après insertion/update/delete d'un avis
CREATE OR REPLACE FUNCTION public.update_reputation_on_review_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Créer le trigger
CREATE TRIGGER trigger_update_reputation
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_reputation_on_review_change();

-- Trigger pour updated_at
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON public.reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON public.reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_lease ON public.reviews(lease_id);
CREATE INDEX IF NOT EXISTS idx_reputation_user ON public.reputation_scores(user_id);