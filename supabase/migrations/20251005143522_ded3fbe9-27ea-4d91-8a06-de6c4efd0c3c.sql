-- Étape 1: Supprimer les contraintes existantes si elles existent
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'rental_applications_applicant_id_fkey'
    ) THEN
        ALTER TABLE public.rental_applications 
        DROP CONSTRAINT rental_applications_applicant_id_fkey;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'rental_applications_property_id_fkey'
    ) THEN
        ALTER TABLE public.rental_applications 
        DROP CONSTRAINT rental_applications_property_id_fkey;
    END IF;
END $$;

-- Étape 2: Ajouter les foreign keys correctes vers profiles et properties
ALTER TABLE public.rental_applications
ADD CONSTRAINT rental_applications_applicant_id_fkey
FOREIGN KEY (applicant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.rental_applications
ADD CONSTRAINT rental_applications_property_id_fkey
FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

-- Étape 3: Créer les index pour améliorer les performances des jointures
CREATE INDEX IF NOT EXISTS idx_rental_applications_applicant_id 
ON public.rental_applications(applicant_id);

CREATE INDEX IF NOT EXISTS idx_rental_applications_property_id 
ON public.rental_applications(property_id);