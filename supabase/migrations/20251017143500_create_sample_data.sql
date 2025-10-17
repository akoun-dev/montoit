/*
  Create Sample Data for Testing

  This migration creates sample data to test the API functionality.
*/

-- Insert a sample property if none exists
DO $$
DECLARE
  property_count INTEGER;
  user_exists BOOLEAN;
  sample_user_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  SELECT COUNT(*) INTO property_count FROM public.properties;

  -- Check if the sample user exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = sample_user_id) INTO user_exists;

  IF property_count = 0 AND user_exists THEN
    INSERT INTO public.properties (
      owner_id,
      title,
      description,
      property_type,
      status,
      address,
      city,
      neighborhood,
      latitude,
      longitude,
      bedrooms,
      bathrooms,
      surface_area,
      monthly_rent,
      deposit_amount,
      is_furnished,
      has_parking,
      has_ac,
      main_image,
      images,
      moderation_status
    ) VALUES (
      sample_user_id,
      'Appartement moderne à Cocody',
      'Bel appartement moderne dans un quartier résidentiel calme avec toutes les commodités à proximité.',
      'appartement',
      'disponible',
      'Rue des Jardins, Cocody',
      'Abidjan',
      'Cocody',
      5.3600,
      -3.9800,
      2,
      1,
      75.5,
      150000,
      300000,
      true,
      true,
      true,
      'https://picsum.photos/seed/apartment-demo/400/300.jpg',
      ARRAY['https://picsum.photos/seed/apartment-demo-1/400/300.jpg', 'https://picsum.photos/seed/apartment-demo-2/400/300.jpg'],
      'approved'
    );

    RAISE NOTICE 'Sample property inserted for testing';
  ELSIF property_count = 0 AND NOT user_exists THEN
    RAISE NOTICE 'Sample user ID % does not exist. Skipping sample property creation.', sample_user_id;
    RAISE NOTICE 'To create sample data:';
    RAISE NOTICE '1. Create a user through Supabase Auth dashboard';
    RAISE NOTICE '2. Note the user UUID';
    RAISE NOTICE '3. Update this migration with the correct user ID';
  END IF;
END $$;