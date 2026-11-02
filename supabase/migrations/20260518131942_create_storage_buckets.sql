-- 042_storage_buckets.sql
-- Create Supabase Storage buckets for file uploads
-- Buckets are created via SQL insert into storage.buckets

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, '{"image/jpeg", "image/png", "image/webp"}'),
  ('property-images', 'property-images', true, 10485760, '{"image/jpeg", "image/png", "image/webp"}'),
  ('property-documents', 'property-documents', true, 20971520, null),
  ('owner-documents', 'owner-documents', true, 20971520, null),
  ('rental-documents', 'rental-documents', true, 20971520, null),
  ('maintenance-images', 'maintenance-images', true, 10485760, '{"image/jpeg", "image/png", "image/webp"}')
on conflict (id) do nothing;

-- RLS policies for storage buckets

-- avatars: any authenticated user can CRUD their own avatar
create policy "avatars_select_own"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars' and (select auth.uid()::text)::text = (storage.foldername(name))[1]);

create policy "avatars_insert_own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (select auth.uid()::text)::text = (storage.foldername(name))[1]);

create policy "avatars_update_own"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (select auth.uid()::text)::text = (storage.foldername(name))[1]);

create policy "avatars_delete_own"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (select auth.uid()::text)::text = (storage.foldername(name))[1]);

-- property-images: authenticated users can manage their own property images
create policy "property_images_select_own"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'property-images');

create policy "property_images_insert_own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'property-images');

create policy "property_images_delete_own"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'property-images');

-- property-documents: authenticated users can manage their own docs
create policy "property_documents_select_own"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'property-documents');

create policy "property_documents_insert_own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'property-documents');

create policy "property_documents_delete_own"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'property-documents');

-- owner-documents
create policy "owner_documents_select_own"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'owner-documents');

create policy "owner_documents_insert_own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'owner-documents');

create policy "owner_documents_delete_own"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'owner-documents');

-- rental-documents
create policy "rental_documents_select_own"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'rental-documents');

create policy "rental_documents_insert_own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'rental-documents');

create policy "rental_documents_delete_own"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'rental-documents');

-- maintenance-images
create policy "maintenance_images_select_own"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'maintenance-images');

create policy "maintenance_images_insert_own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'maintenance-images');

create policy "maintenance_images_delete_own"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'maintenance-images');
