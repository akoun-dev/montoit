-- Migration: Create lease-documents storage bucket
-- Description: Bucket for storing lease contract PDFs

DO $$
BEGIN
  IF to_regnamespace('storage') IS NULL THEN
    RAISE NOTICE 'Storage schema not found; skipping bucket creation.';
    RETURN;
  END IF;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES
    ('lease-documents', 'lease-documents', false, 104857600, ARRAY['application/pdf'])
  ON CONFLICT (id) DO NOTHING;
END $$;
