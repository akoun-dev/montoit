-- 20260519132002_create_storage_buckets_videos_leases.sql
-- Add storage buckets for property videos and lease documents
-- Uses on conflict do nothing so it's safe to run multiple times

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('property-videos', 'property-videos', true, 52428800, '{"video/mp4", "video/quicktime", "video/webm"}'),
  ('lease-documents', 'lease-documents', true, 20971520, '{"application/pdf"}')
on conflict (id) do nothing;

-- ── property-videos: authenticated users can manage their own property videos ──

create policy "property_videos_select_own"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'property-videos');

create policy "property_videos_insert_own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'property-videos');

create policy "property_videos_update_own"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'property-videos');

create policy "property_videos_delete_own"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'property-videos');

-- ── lease-documents: authenticated users can manage their own lease PDFs ──

create policy "lease_documents_select_own"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'lease-documents');

create policy "lease_documents_insert_own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'lease-documents');

create policy "lease_documents_update_own"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'lease-documents');

create policy "lease_documents_delete_own"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'lease-documents');

-- Ensure lease-documents bucket is public (CRYPTONEO needs to download PDFs via public URL)
update storage.buckets set public = true where id = 'lease-documents';
