-- Migration pour ajouter les champs agence à la table profiles
-- Exécuter cette migration dans le SQL Editor de Supabase

BEGIN;

-- Ajouter agency_name si inexistant
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS agency_name text;

-- Ajouter agency_logo si inexistant
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS agency_logo text;

-- Ajouter agency_description si inexistant
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS agency_description text;

-- Ajouter agency_website si inexistant
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS agency_website text;

-- Ajouter agency_phone si inexistant
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS agency_phone text;

-- Ajouter agency_email si inexistant
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS agency_email text;

-- Ajouter agency_id si inexistant (pour lier avec la table agencies)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES agencies(id) ON DELETE SET NULL;

-- Ajouter verification_documents (JSON) pour stocker les documents de vérification
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS verification_documents jsonb DEFAULT '[]'::jsonb;

-- Commentaire
COMMENT ON COLUMN profiles.verification_documents IS 'Documents de vérification de l''agence (PDF: titres fonciers, documents cadastraux, etc.)';

COMMIT;
