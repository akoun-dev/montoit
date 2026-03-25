-- Quick fix: Create missing storage buckets
-- Run this in Supabase SQL Editor

DO $$
BEGIN
  IF to_regnamespace('storage') IS NULL THEN
    RAISE NOTICE 'Storage schema not found; skipping bucket creation.';
    RETURN;
  END IF;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES
    ('dossiers-locataires', 'dossiers-locataires', true, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
    ('dossiers-proprietaires', 'dossiers-proprietaires', true, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
    ('dossiers-agences', 'dossiers-agences', true, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png'])
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Storage buckets created successfully!';
END $$;
