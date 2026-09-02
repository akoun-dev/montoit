-- 20260522000001_make_lease_documents_bucket_public.sql
-- Ensure lease-documents bucket is public (CRYPTONEO needs to download PDFs via public URL)
-- The original migration sets public=true but the bucket may have been created manually (private)

update storage.buckets
set public = true
where id = 'lease-documents';
