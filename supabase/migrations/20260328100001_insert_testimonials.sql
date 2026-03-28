-- Migration: Insert Testimonials for Testing
-- Description: Add sample reviews to demonstrate dynamic testimonials feature

-- Get existing profiles and insert reviews
DO $$
DECLARE
  v_property_id UUID;
  v_profiles RECORD;
  v_counter INTEGER := 0;
BEGIN
  -- Try to get an existing property
  SELECT id INTO v_property_id FROM properties LIMIT 1;

  -- If no property exists, create a dummy one for testing
  IF v_property_id IS NULL THEN
    INSERT INTO properties (id, owner_id, title, property_type, city, neighborhood, price, bedrooms, bathrooms, surface_area, status, created_at)
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      (SELECT id FROM profiles LIMIT 1),
      'Appartement moderne 3 pièces à Cocody',
      'apartment',
      'Abidjan',
      'Cocody',
      250000,
      3,
      2,
      85,
      'available',
      NOW()
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING id INTO v_property_id;

    IF v_property_id IS NULL THEN
      SELECT id INTO v_property_id FROM properties LIMIT 1;
    END IF;
  END IF;

  -- Check if we have any profiles
  IF NOT EXISTS (SELECT 1 FROM profiles LIMIT 1) THEN
    RAISE NOTICE 'No profiles found. Skipping testimonial insertion.';
    RETURN;
  END IF;

  -- Insert sample reviews using existing profiles
  -- We'll create reviews for different profiles that exist in the database
  FOR v_profiles IN
    SELECT id, full_name, user_type FROM profiles LIMIT 7
  LOOP
    v_counter := v_counter + 1;

    INSERT INTO reviews (reviewer_id, reviewee_id, property_id, review_type, rating, comment, moderation_status, is_visible, helpful_count, created_at)
    VALUES (
      v_profiles.id,
      (SELECT id FROM profiles WHERE id != v_profiles.id LIMIT 1),
      v_property_id,
      'property',
      CASE v_counter
        WHEN 1 THEN 5
        WHEN 2 THEN 5
        WHEN 3 THEN 5
        WHEN 4 THEN 5
        WHEN 5 THEN 5
        WHEN 6 THEN 5
        WHEN 7 THEN 4
        ELSE 5
      END,
      CASE v_counter
        WHEN 1 THEN 'J''ai trouvé mon appartement en moins d''une semaine grâce à Mon Toit. La vérification des propriétés m''a vraiment rassuré. La plateforme est intuitive et les propriétaires sont réactifs. Je recommande vivement à tous ceux qui cherchent un logement à Abidjan !'
        WHEN 2 THEN 'En tant que propriétaire, je suis impressionnée par le sérieux de la plateforme. Les locataires sont vérifiés et les paiements sont sécurisés. J''ai reçu plusieurs demandes de qualité et j''ai pu louer mon bien rapidement. Excellent service !'
        WHEN 3 THEN 'La signature électronique du bail a été un vrai plus. Tout s''est fait rapidement et de manière transparente. Plus besoin de se déplacer pour signer les papiers, tout se fait en ligne. Excellente expérience de A à Z !'
        WHEN 4 THEN 'Le système de score de confiance est génial. Je sais exactement à qui je loue mon bien. Mon Toit a changé ma façon de gérer mes propriétés. Je peux enfin louer en toute sérénité grâce à la vérification des locataires.'
        WHEN 5 THEN 'Enfin une plateforme qui comprend les réalités ivoiriennes ! Le paiement via Mobile Money est super pratique. L''interface est en français et le service client est très réactif. Merci Mon Toit pour cette innovation !'
        WHEN 6 THEN 'J''avais peur de trouver un logement à Abidjan étant nouveau dans la ville. Mon Toit m''a permis de trouver un studio à Bingerville en seulement 3 jours. Les photos sont vraies et les descriptions fiables. Bravo pour cette plateforme !'
        WHEN 7 THEN 'Très bonne expérience globale. La plateforme est facile à utiliser et les filtres de recherche sont pertinents. J''ai pu visiter rapidement plusieurs appartements. Seul petit point : il y a parfois beaucoup de demandes pour les biens les plus attractifs.'
        ELSE 'Super plateforme !'
      END,
      'approved',
      true,
      (10 + v_counter * 3)::INTEGER,
      NOW() - (v_counter || ' days')::INTERVAL
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Testimonials inserted successfully. Property ID used: %', v_property_id;
END $$;

-- Verify insertion
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM reviews WHERE moderation_status = 'approved' AND is_visible = true;
  RAISE NOTICE 'Total approved and visible reviews in database: %', v_count;
END $$;
