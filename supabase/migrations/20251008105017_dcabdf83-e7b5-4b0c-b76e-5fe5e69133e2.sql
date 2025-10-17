-- Créer le bucket pour les images des propriétés
INSERT INTO storage.buckets (id, name, public) 
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

-- Politique RLS pour permettre la lecture publique
CREATE POLICY "Public read access for property images"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-images');

-- Politique RLS pour permettre l'upload authentifié
CREATE POLICY "Authenticated users can upload property images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'property-images' AND auth.uid() IS NOT NULL);

-- Politique RLS pour permettre la mise à jour par le propriétaire
CREATE POLICY "Users can update their own property images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'property-images' AND auth.uid() IS NOT NULL);

-- Politique RLS pour permettre la suppression par le propriétaire
CREATE POLICY "Users can delete their own property images"
ON storage.objects FOR DELETE
USING (bucket_id = 'property-images' AND auth.uid() IS NOT NULL);