-- Migration: Create separate dossier storage buckets
-- Description: Create storage buckets for tenant, owner and agency documents

DO $$
BEGIN
  IF to_regnamespace('storage') IS NULL THEN
    RAISE NOTICE 'Storage schema not found; skipping bucket creation.';
    RETURN;
  END IF;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES
    ('dossiers-locataires', 'dossiers-locataires', true, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
    ('dossiers-proprietaires', 'dossiers-proprietaires', true, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
    ('dossiers-agences', 'dossiers-agences', true, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Dossier storage buckets created successfully!';
END $$;
