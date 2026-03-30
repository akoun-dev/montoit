-- Ajouter agency_id aux tables de visites et candidatures
-- Permet de suivre quelle agence gère les visites/candidatures quand un mandat actif existe

-- Ajouter agency_id à visit_requests
ALTER TABLE public.visit_requests
ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Ajouter agency_id à rental_applications
ALTER TABLE public.rental_applications
ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Créer un index pour optimiser les requêtes par agence
CREATE INDEX IF NOT EXISTS idx_visit_requests_agency_id ON public.visit_requests(agency_id);
CREATE INDEX IF NOT EXISTS idx_rental_applications_agency_id ON public.rental_applications(agency_id);

-- Commentaires
COMMENT ON COLUMN public.visit_requests.agency_id IS 'ID de l''agence qui gère la visite (via mandat actif)';
COMMENT ON COLUMN public.rental_applications.agency_id IS 'ID de l''agence qui gère la candidature (via mandat actif)';
