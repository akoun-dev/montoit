-- ============================================
-- Titre de propriété avec RLS strict
-- ============================================

-- 1. Créer le bucket property-documents (PRIVÉ)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-documents',
  'property-documents',
  false,
  10485760, -- 10 MB max
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS Policy : SELECT (téléchargement)
CREATE POLICY "Restricted title deed access"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'property-documents'
  AND (
    -- Propriétaire du bien
    auth.uid() IN (
      SELECT owner_id FROM properties 
      WHERE id::text = (storage.foldername(name))[1]
    )
    -- Locataire avec bail actif
    OR auth.uid() IN (
      SELECT tenant_id FROM leases 
      WHERE property_id::text = (storage.foldername(name))[1]
        AND status = 'active'
    )
    -- Admins
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- 3. RLS Policy : INSERT (upload)
CREATE POLICY "Owners can upload title deeds"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-documents' 
  AND auth.uid() IN (
    SELECT owner_id FROM properties 
    WHERE id::text = (storage.foldername(name))[1]
  )
);

-- 4. RLS Policy : UPDATE (remplacement)
CREATE POLICY "Owners can update title deeds"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'property-documents'
  AND auth.uid() IN (
    SELECT owner_id FROM properties 
    WHERE id::text = (storage.foldername(name))[1]
  )
);

-- 5. RLS Policy : DELETE (suppression)
CREATE POLICY "Owners can delete title deeds"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-documents'
  AND auth.uid() IN (
    SELECT owner_id FROM properties 
    WHERE id::text = (storage.foldername(name))[1]
  )
);

-- 6. Table de logs d'accès dédiée
CREATE TABLE IF NOT EXISTS public.title_deed_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  requester_id UUID,
  access_granted BOOLEAN NOT NULL,
  access_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  accessed_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Activer RLS sur la table de logs
ALTER TABLE public.title_deed_access_log ENABLE ROW LEVEL SECURITY;

-- 8. Seuls les admins peuvent voir les logs
CREATE POLICY "Admins can view title deed logs"
ON public.title_deed_access_log FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role) 
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- 9. Tout le monde peut insérer des logs (pour traçabilité)
CREATE POLICY "Anyone can insert access logs"
ON public.title_deed_access_log FOR INSERT
WITH CHECK (auth.uid() = requester_id OR requester_id IS NULL);