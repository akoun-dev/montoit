-- ===================================================================
-- Script de Seed corrigé pour Supabase Mon Toit
-- À exécuter dans SQL Editor de Supabase avec SERVICE ROLE
-- ===================================================================

-- ===================================================================
-- 1. CRÉATION DES UTILISATEURS DE TEST
-- ===================================================================

DO $$
DECLARE
  user1_id UUID;
  user2_id UUID;
  user1_exists BOOLEAN;
  user2_exists BOOLEAN;
  property_count INTEGER;
BEGIN
  -- Vérifier si les utilisateurs de test existent déjà
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'proprietaire1@test.com') INTO user1_exists;
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'agence1@test.com') INTO user2_exists;
  
  -- Vérifier combien de propriétés existent déjà
  SELECT COUNT(*) INTO property_count FROM public.properties;

  -- Créer le premier utilisateur de test (propriétaire individuel)
  IF NOT user1_exists THEN
    INSERT INTO auth.users (
      id,
      email,
      email_confirmed_at,
      phone,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      'proprietaire1@test.com',
      NOW(),
      '+2250707070707',
      '{"full_name": "Jean Kouadio", "user_type": "proprietaire"}',
      NOW(),
      NOW()
    ) RETURNING id INTO user1_id;
    
    RAISE NOTICE 'Utilisateur proprietaire1@test.com créé avec ID: %', user1_id;
  ELSE
    SELECT id INTO user1_id FROM auth.users WHERE email = 'proprietaire1@test.com';
    RAISE NOTICE 'Utilisateur proprietaire1@test.com existe déjà avec ID: %', user1_id;
  END IF;

  -- Créer le deuxième utilisateur de test (agence)
  IF NOT user2_exists THEN
    INSERT INTO auth.users (
      id,
      email,
      email_confirmed_at,
      phone,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      'agence1@test.com',
      NOW(),
      '+2250808080808',
      '{"full_name": "Agence Immobilière Abidjan", "user_type": "agence"}',
      NOW(),
      NOW()
    ) RETURNING id INTO user2_id;
    
    RAISE NOTICE 'Utilisateur agence1@test.com créé avec ID: %', user2_id;
  ELSE
    SELECT id INTO user2_id FROM auth.users WHERE email = 'agence1@test.com';
    RAISE NOTICE 'Utilisateur agence1@test.com existe déjà avec ID: %', user2_id;
  END IF;

  -- ===================================================================
  -- 2. CRÉATION DES BIENS IMMOBILIERS (avec des owner_id réels)
  -- ===================================================================

  IF property_count = 0 THEN
    -- Insérer 8 biens de test pour Abidjan répartis entre les 2 utilisateurs
    
    -- Propriétés du propriétaire individuel (5 biens)
    INSERT INTO public.properties (
      owner_id, title, description, property_type, status,
      address, city, neighborhood, latitude, longitude,
      bedrooms, bathrooms, surface_area, monthly_rent, deposit_amount,
      is_furnished, has_parking, has_garden, has_ac,
      main_image, images, moderation_status
    ) VALUES
    (
      user1_id,
      'Villa Moderne 4 Chambres - Cocody',
      'Magnifique villa moderne avec 4 chambres, salon spacieux, cuisine équipée, jardin et piscine. Située dans un quartier calme et sécurisé de Cocody.',
      'villa',
      'disponible',
      'Cocody, Riviera Golf',
      'Abidjan',
      'Riviera Golf',
      5.3599517,
      -3.9810128,
      4,
      3,
      250,
      450000,
      900000,
      true,
      true,
      true,
      true,
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
      ARRAY[
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'
      ],
      'approved'
    ),
    (
      user1_id,
      'Appartement 3 Pièces - Plateau',
      'Bel appartement de 3 pièces au cœur du Plateau, proche de tous commerces et transports. Vue imprenable sur la ville.',
      'appartement',
      'disponible',
      'Plateau, Avenue Franchet d''Esperey',
      'Abidjan',
      'Plateau',
      5.3266155,
      -4.0083155,
      2,
      1,
      85,
      250000,
      500000,
      true,
      true,
      false,
      true,
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      ARRAY[
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'
      ],
      'approved'
    ),
    (
      user1_id,
      'Studio Meublé - Marcory',
      'Studio moderne entièrement meublé et équipé, idéal pour jeune professionnel. Proche de la zone 4.',
      'studio',
      'disponible',
      'Marcory, Zone 4',
      'Abidjan',
      'Marcory',
      5.2892436,
      -3.9810128,
      1,
      1,
      35,
      120000,
      240000,
      true,
      false,
      false,
      true,
      'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800',
      ARRAY['https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800'],
      'approved'
    ),
    (
      user1_id,
      'Duplex 5 Chambres - Yopougon',
      'Grand duplex de 5 chambres avec terrasse, parfait pour famille nombreuse. Quartier résidentiel calme.',
      'duplex',
      'disponible',
      'Yopougon, Niangon Nord',
      'Abidjan',
      'Yopougon',
      5.3364449,
      -4.0890556,
      5,
      3,
      180,
      350000,
      700000,
      false,
      true,
      true,
      false,
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800',
      ARRAY[
        'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800',
        'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800'
      ],
      'approved'
    ),
    (
      user1_id,
      'Villa de Luxe - Cocody',
      'Villa de prestige avec 6 chambres, piscine, jardin paysager, garage 3 voitures. Sécurité 24/7.',
      'villa',
      'disponible',
      'Cocody, Riviera Palmeraie',
      'Abidjan',
      'Riviera Palmeraie',
      5.3599517,
      -3.9610128,
      6,
      5,
      400,
      850000,
      1700000,
      true,
      true,
      true,
      true,
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
      ARRAY[
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
        'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'
      ],
      'approved'
    );

    -- Propriétés de l'agence (3 biens)
    INSERT INTO public.properties (
      owner_id, title, description, property_type, status,
      address, city, neighborhood, latitude, longitude,
      bedrooms, bathrooms, surface_area, monthly_rent, deposit_amount,
      is_furnished, has_parking, has_garden, has_ac,
      main_image, images, moderation_status
    ) VALUES
    (
      user2_id,
      'Appartement Standing - Cocody',
      'Appartement haut standing avec finitions luxueuses, dans résidence sécurisée avec piscine commune.',
      'appartement',
      'disponible',
      'Cocody, Angré 8ème Tranche',
      'Abidjan',
      'Angré',
      5.3964912,
      -3.9810128,
      3,
      2,
      120,
      380000,
      760000,
      true,
      true,
      false,
      true,
      'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800',
      ARRAY[
        'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800',
        'https://images.unsplash.com/photo-1600566753151-384129cf4e3e?w=800'
      ],
      'approved'
    ),
    (
      user2_id,
      'Local Commercial 3 Chambres - Abobo',
      'Local commercial familial avec 3 pièces, salon, cuisine, cour. Quartier populaire et animé.',
      'local_commercial',
      'disponible',
      'Abobo, Avocatier',
      'Abidjan',
      'Abobo',
      5.4167,
      -4.0167,
      3,
      2,
      100,
      180000,
      360000,
      false,
      true,
      true,
      false,
      'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800',
      ARRAY['https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800'],
      'approved'
    ),
    (
      user2_id,
      'Appartement 2 Pièces - Treichville',
      'Appartement lumineux de 2 pièces, proche du marché et des transports. Idéal premier achat.',
      'appartement',
      'disponible',
      'Treichville, Boulevard de Marseille',
      'Abidjan',
      'Treichville',
      5.2892436,
      -4.0083155,
      1,
      1,
      55,
      150000,
      300000,
      false,
      false,
      false,
      true,
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
      ARRAY['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'],
      'approved'
    );

    RAISE NOTICE '8 propriétés créées avec succès !';
  ELSE
    RAISE NOTICE 'Des propriétés existent déjà (% trouvées). Aucune création nécessaire.', property_count;
  END IF;

END $$;

-- ===================================================================
-- 3. VÉRIFICATION ET RAPPORT
-- ===================================================================

-- Rapport des données créées
SELECT '=== RAPPORT DE CRÉATION DES DONNÉES DE TEST ===' as rapport;

SELECT 'UTILISATEURS DE TEST CRÉÉS:' as section;
SELECT 
  u.id, 
  u.email, 
  p.full_name, 
  p.user_type,
  p.created_at
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE u.email IN ('proprietaire1@test.com', 'agence1@test.com')
ORDER BY u.email;

SELECT 'PROPRIÉTÉS CRÉÉES PAR TYPE:' as section;
SELECT 
  property_type, 
  COUNT(*) as count, 
  AVG(monthly_rent) as avg_rent,
  MIN(monthly_rent) as min_rent,
  MAX(monthly_rent) as max_rent
FROM public.properties
GROUP BY property_type
ORDER BY count DESC;

SELECT 'PROPRIÉTÉS PAR PROPRIÉTAIRE:' as section;
SELECT 
  p.full_name as proprietaire,
  COUNT(pr.id) as nb_proprietes,
  AVG(pr.monthly_rent) as loyer_moyen
FROM public.properties pr
JOIN public.profiles p ON pr.owner_id = p.id
WHERE p.user_type IN ('proprietaire', 'agence')
GROUP BY p.id, p.full_name
ORDER BY nb_proprietes DESC;

SELECT '=== 5 PREMIÈRES PROPRIÉTÉS CRÉÉES ===' as section;
SELECT 
  pr.id, 
  pr.title, 
  pr.property_type, 
  pr.city, 
  pr.monthly_rent, 
  pr.moderation_status,
  p.full_name as proprietaire
FROM public.properties pr
JOIN public.profiles p ON pr.owner_id = p.id
ORDER BY pr.created_at DESC
LIMIT 5;

SELECT '=== Seed corrigé exécuté avec succès ! ===' as rapport;
SELECT 'Utilisateurs de test:' as info;
SELECT '- proprietaire1@test.com (Jean Kouadio)' as user;
SELECT '- agence1@test.com (Agence Immobilière Abidjan)' as user;
SELECT '' as info;
SELECT 'Total propriétés créées: 8' as info;
SELECT 'Répartition: 5 propriétés pour propriétaire individuel, 3 pour agence' as info;
