-- Étape 1: Ajouter super_admin à l'enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';