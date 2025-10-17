-- Add multimedia columns to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS virtual_tour_url text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS panoramic_images jsonb DEFAULT '[]'::jsonb;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS floor_plans jsonb DEFAULT '[]'::jsonb;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS media_metadata jsonb DEFAULT '{}'::jsonb;

-- Create storage buckets for multimedia content
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('property-videos', 'property-videos', true),
  ('property-360', 'property-360', true),
  ('property-plans', 'property-plans', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for property-videos bucket
CREATE POLICY "Anyone can view property videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-videos');

CREATE POLICY "Property owners can upload videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-videos' AND
  auth.uid() IN (
    SELECT owner_id FROM properties 
    WHERE id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Property owners can update their videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'property-videos' AND
  auth.uid() IN (
    SELECT owner_id FROM properties 
    WHERE id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Property owners can delete their videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-videos' AND
  auth.uid() IN (
    SELECT owner_id FROM properties 
    WHERE id::text = (storage.foldername(name))[1]
  )
);

-- RLS policies for property-360 bucket
CREATE POLICY "Anyone can view 360 images"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-360');

CREATE POLICY "Property owners can upload 360 images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-360' AND
  auth.uid() IN (
    SELECT owner_id FROM properties 
    WHERE id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Property owners can update their 360 images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'property-360' AND
  auth.uid() IN (
    SELECT owner_id FROM properties 
    WHERE id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Property owners can delete their 360 images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-360' AND
  auth.uid() IN (
    SELECT owner_id FROM properties 
    WHERE id::text = (storage.foldername(name))[1]
  )
);

-- RLS policies for property-plans bucket
CREATE POLICY "Anyone can view floor plans"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-plans');

CREATE POLICY "Property owners can upload floor plans"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-plans' AND
  auth.uid() IN (
    SELECT owner_id FROM properties 
    WHERE id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Property owners can update their floor plans"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'property-plans' AND
  auth.uid() IN (
    SELECT owner_id FROM properties 
    WHERE id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Property owners can delete their floor plans"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-plans' AND
  auth.uid() IN (
    SELECT owner_id FROM properties 
    WHERE id::text = (storage.foldername(name))[1]
  )
);