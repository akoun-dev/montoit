-- Tâche 3 : Ajouter le rôle tiers_de_confiance - PARTIE 1
-- Ajouter 'tiers_de_confiance' à l'enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tiers_de_confiance';