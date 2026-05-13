-- Migration: Create mandate signatures storage bucket
-- Description: Storage bucket for mandate signature images

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mandate-signatures',
  'mandate-signatures',
  true,
  52428800,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload mandate signatures" ON storage.objects;
DROP POLICY IF EXISTS "Public can view mandate signatures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own mandate signatures" ON storage.objects;

-- Policy to allow authenticated users to upload signatures
CREATE POLICY "Users can upload mandate signatures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mandate-signatures'
  AND auth.role() = 'authenticated'
);

-- Policy to allow public access to view signatures
CREATE POLICY "Public can view mandate signatures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'mandate-signatures');

-- Policy to allow users to delete their own signatures
CREATE POLICY "Users can delete own mandate signatures"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'mandate-signatures'
  AND auth.role() = 'authenticated'
);

