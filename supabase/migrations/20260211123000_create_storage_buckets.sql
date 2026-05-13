-- Migration: Create storage buckets needed by the app
-- Description: Ensure required Supabase Storage buckets exist in local/dev

DO $$
BEGIN
  IF to_regnamespace('storage') IS NULL THEN
    RAISE NOTICE 'Storage schema not found; skipping bucket creation.';
    RETURN;
  END IF;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES
    ('avatars', 'avatars', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('documents', 'documents', true, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
    ('verifications', 'verifications', true, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
    ('property-images', 'property-images', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('maintenance-photos', 'maintenance-photos', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('review-photos', 'review-photos', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('dossiers-locataires', 'dossiers-locataires', true, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
    ('dossiers-proprietaires', 'dossiers-proprietaires', true, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
    ('dossiers-agences', 'dossiers-agences', true, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
    ('owner-documents', 'owner-documents', false, 104857600, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/webp']),
    ('message-attachments', 'message-attachments', true, 10485760, ARRAY['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
    ('support-attachments', 'support-attachments', true, 10485760, ARRAY['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
  ON CONFLICT (id) DO NOTHING;
END $$;
