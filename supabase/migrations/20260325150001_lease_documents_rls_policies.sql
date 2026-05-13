-- Migration: RLS policies for lease-documents bucket
-- Description: Allow users involved in a lease to upload/download contract documents

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Lease documents can be uploaded by lease participants" ON storage.objects;
DROP POLICY IF EXISTS "Lease documents can be viewed by lease participants" ON storage.objects;
DROP POLICY IF EXISTS "Lease documents can be updated by lease participants" ON storage.objects;

-- Policy: Allow upload for lease participants (owner and tenant)
-- The folder structure is: lease_id/filename.pdf
CREATE POLICY "Lease documents can be uploaded by lease participants"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lease-documents'
  AND (
    -- Owner can upload: folder name matches their owned lease
    EXISTS (
      SELECT 1 FROM lease_contracts
      WHERE lease_contracts.id::text = SPLIT_PART(storage.objects.name, '/', 1)
      AND lease_contracts.owner_id = auth.uid()
    )
    OR
    -- Tenant can upload
    EXISTS (
      SELECT 1 FROM lease_contracts
      WHERE lease_contracts.id::text = SPLIT_PART(storage.objects.name, '/', 1)
      AND lease_contracts.tenant_id = auth.uid()
    )
    OR
    -- Agency can upload if they manage the property
    EXISTS (
      SELECT 1 FROM lease_contracts
      WHERE lease_contracts.id::text = SPLIT_PART(storage.objects.name, '/', 1)
      AND lease_contracts.agency_id = auth.uid()
    )
  )
);

-- Policy: Allow viewing for lease participants
CREATE POLICY "Lease documents can be viewed by lease participants"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'lease-documents'
  AND (
    -- Owner can view
    EXISTS (
      SELECT 1 FROM lease_contracts
      WHERE lease_contracts.id::text = SPLIT_PART(storage.objects.name, '/', 1)
      AND lease_contracts.owner_id = auth.uid()
    )
    OR
    -- Tenant can view
    EXISTS (
      SELECT 1 FROM lease_contracts
      WHERE lease_contracts.id::text = SPLIT_PART(storage.objects.name, '/', 1)
      AND lease_contracts.tenant_id = auth.uid()
    )
    OR
    -- Agency can view
    EXISTS (
      SELECT 1 FROM lease_contracts
      WHERE lease_contracts.id::text = SPLIT_PART(storage.objects.name, '/', 1)
      AND lease_contracts.agency_id = auth.uid()
    )
  )
);

-- Policy: Allow update (replace) for lease participants
CREATE POLICY "Lease documents can be updated by lease participants"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lease-documents'
  AND (
    EXISTS (
      SELECT 1 FROM lease_contracts
      WHERE lease_contracts.id::text = SPLIT_PART(storage.objects.name, '/', 1)
      AND (lease_contracts.owner_id = auth.uid() OR lease_contracts.tenant_id = auth.uid() OR lease_contracts.agency_id = auth.uid())
    )
  )
)
WITH CHECK (
  bucket_id = 'lease-documents'
  AND (
    EXISTS (
      SELECT 1 FROM lease_contracts
      WHERE lease_contracts.id::text = SPLIT_PART(storage.objects.name, '/', 1)
      AND (lease_contracts.owner_id = auth.uid() OR lease_contracts.tenant_id = auth.uid() OR lease_contracts.agency_id = auth.uid())
    )
  )
);
