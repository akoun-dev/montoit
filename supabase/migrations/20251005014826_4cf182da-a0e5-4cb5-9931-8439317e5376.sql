-- ÉPIC 8: Système de Recommandations Intelligentes
-- Tables pour gérer les préférences, historique et cache de recommandations

-- Table des préférences utilisateur
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  preferred_cities TEXT[] DEFAULT '{}',
  preferred_property_types TEXT[] DEFAULT '{}',
  min_budget NUMERIC,
  max_budget NUMERIC,
  min_bedrooms INTEGER DEFAULT 0,
  min_bathrooms INTEGER DEFAULT 0,
  requires_furnished BOOLEAN DEFAULT false,
  requires_ac BOOLEAN DEFAULT false,
  requires_parking BOOLEAN DEFAULT false,
  requires_garden BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS pour user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
ON public.user_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
ON public.user_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.user_preferences
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences"
ON public.user_preferences
FOR DELETE
USING (auth.uid() = user_id);

-- Table de l'historique de recherche
CREATE TABLE public.search_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  search_filters JSONB NOT NULL DEFAULT '{}',
  result_count INTEGER DEFAULT 0,
  clicked_properties UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX idx_search_history_user_id ON public.search_history(user_id);
CREATE INDEX idx_search_history_created_at ON public.search_history(created_at DESC);

-- RLS pour search_history
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own search history"
ON public.search_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search history"
ON public.search_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own search history"
ON public.search_history
FOR DELETE
USING (auth.uid() = user_id);

-- Table de cache des recommandations
CREATE TABLE public.recommendation_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('property_for_tenant', 'tenant_for_property')),
  recommended_items JSONB NOT NULL DEFAULT '[]',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX idx_recommendation_cache_user_id ON public.recommendation_cache(user_id);
CREATE INDEX idx_recommendation_cache_expires_at ON public.recommendation_cache(expires_at);

-- RLS pour recommendation_cache
ALTER TABLE public.recommendation_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recommendation cache"
ON public.recommendation_cache
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert recommendation cache"
ON public.recommendation_cache
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update recommendation cache"
ON public.recommendation_cache
FOR UPDATE
USING (true);

CREATE POLICY "System can delete expired recommendation cache"
ON public.recommendation_cache
FOR DELETE
USING (true);

-- Trigger pour auto-update du updated_at sur user_preferences
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour nettoyer le cache expiré (à exécuter périodiquement)
CREATE OR REPLACE FUNCTION public.cleanup_expired_recommendations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.recommendation_cache
  WHERE expires_at < now();
END;
$$;