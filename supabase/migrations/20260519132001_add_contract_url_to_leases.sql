-- Add columns for CRYPTONEO signature flow
alter table leases add column if not exists contract_url text;
alter table leases add column if not exists cryptoneo_operation_id text;

-- Create lease-documents bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('lease-documents', 'lease-documents', true)
on conflict (id) do nothing;

-- Allow authenticated users to read lease documents
create policy "lease_documents_select_authenticated"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'lease-documents'::text
  );

-- Allow authenticated users to insert lease documents (for server-side uploads)
create policy "lease_documents_insert_authenticated"
  on storage.objects for insert
  to authenticated
  using (
    bucket_id = 'lease-documents'::text
  );
