-- Créer le bucket pour les documents de bail
INSERT INTO storage.buckets (id, name, public)
VALUES ('lease-documents', 'lease-documents', false);

-- Politique RLS : Les parties du bail peuvent voir leurs contrats
CREATE POLICY "Parties peuvent voir leurs contrats"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'lease-documents'
  AND (
    auth.uid() IN (
      SELECT landlord_id FROM public.leases 
      WHERE 'leases/' || id::text || '.pdf' = name
      UNION
      SELECT tenant_id FROM public.leases 
      WHERE 'leases/' || id::text || '.pdf' = name
    )
  )
);

-- Politique RLS : Service role peut uploader les documents
CREATE POLICY "Service role peut uploader"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'lease-documents');