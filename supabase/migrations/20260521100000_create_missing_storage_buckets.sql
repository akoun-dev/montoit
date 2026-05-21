-- 20260521100000_create_missing_storage_buckets.sql
-- Add all missing storage buckets for property images, documents, etc.
-- Uses on conflict do nothing so it's safe to run multiple times

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('property-images', 'property-images', true, 5242880, '{"image/jpeg", "image/jpg", "image/png", "image/webp"}'),
  ('property-documents', 'property-documents', true, 20971520, '{"application/pdf", "image/jpeg", "image/png"}'),
  ('owner-documents', 'owner-documents', true, 20971520, '{"application/pdf", "image/jpeg", "image/png"}'),
  ('rental-documents', 'rental-documents', true, 20971520, '{"application/pdf"}'),
  ('maintenance-images', 'maintenance-images', true, 10485760, '{"image/jpeg", "image/jpg", "image/png", "image/webp"}'),
  ('avatars', 'avatars', true, 2097152, '{"image/jpeg", "image/jpg", "image/png", "image/webp"}')
on conflict (id) do nothing;

-- ── property-images ──

create policy "property_images_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'property-images');

create policy "property_images_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'property-images');

create policy "property_images_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'property-images');

create policy "property_images_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'property-images');

-- ── property-documents ──

create policy "property_documents_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'property-documents');

create policy "property_documents_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'property-documents');

create policy "property_documents_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'property-documents');

create policy "property_documents_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'property-documents');

-- ── owner-documents ──

create policy "owner_documents_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'owner-documents');

create policy "owner_documents_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'owner-documents');

create policy "owner_documents_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'owner-documents');

create policy "owner_documents_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'owner-documents');

-- ── rental-documents ──

create policy "rental_documents_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'rental-documents');

create policy "rental_documents_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'rental-documents');

create policy "rental_documents_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'rental-documents');

create policy "rental_documents_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'rental-documents');

-- ── maintenance-images ──

create policy "maintenance_images_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'maintenance-images');

create policy "maintenance_images_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'maintenance-images');

create policy "maintenance_images_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'maintenance-images');

create policy "maintenance_images_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'maintenance-images');

-- ── avatars ──

create policy "avatars_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars');

create policy "avatars_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars');

create policy "avatars_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars');

create policy "avatars_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars');
