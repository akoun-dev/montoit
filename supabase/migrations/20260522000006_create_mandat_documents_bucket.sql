-- Update bucket for mandate documents to accept HTML
-- Update allowed_mime_types to include HTML (temporarily, for HTML->PDF workflow)
delete from storage.buckets where id = 'mandat-documents';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mandat-documents',
  'mandat-documents',
  true,
  52428800,
  array['application/pdf', 'text/html']::text[]
);

-- Policy: Public read access for mandat documents
drop policy if exists "mandat-documents_public_read" on storage.objects;
create policy "mandat-documents_public_read"
on storage.objects
for select
to public
using (bucket_id = 'mandat-documents');

-- Policy: Authenticated users can upload mandat documents
drop policy if exists "mandat-documents_auth_upload" on storage.objects;
create policy "mandat-documents_auth_upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'mandat-documents'
);

-- Policy: Authenticated users can update mandat documents
drop policy if exists "mandat-documents_auth_update" on storage.objects;
create policy "mandat-documents_auth_update"
on storage.objects
for update
to authenticated
with check (
  bucket_id = 'mandat-documents'
);