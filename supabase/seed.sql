-- ===================================================================
-- Script de Seed corrigé pour Supabase Mon Toit
-- À exécuter dans SQL Editor de Supabase avec SERVICE ROLE
-- ===================================================================

-- ===================================================================
-- 1. CRÉATION DES UTILISATEURS DE TEST
-- ===================================================================

DO $$
DECLARE
  -- Comptes de développement
  locataire_id UUID;
  proprietaire1_id UUID;
  agence1_id UUID;
  admin_id UUID;
  super_admin_id UUID;
  
  -- Comptes de démonstration
  demo_locataire_id UUID;
  demo_proprietaire_id UUID;
  demo_agence_id UUID;
  
  -- Comptes de staging
  staging_locataire_id UUID;
  staging_proprietaire_id UUID;
  staging_agence_id UUID;
  
  user_exists BOOLEAN;
  property_count INTEGER;
BEGIN
  RAISE NOTICE '=== CRÉATION DE TOUS LES COMPTES UTILISATEURS ===';
  
  -- ===================================================================
  -- 1. COMPTES DE DÉVELOPPEMENT
  -- ===================================================================
  
  -- Locataire de développement
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'locataire@test.com') INTO user_exists;
  IF NOT user_exists THEN
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
      'locataire@test.com',
      NOW(),
      '+2250101010101',
      '{"full_name": "Marie Konan", "user_type": "locataire"}',
      NOW(),
      NOW()
    ) RETURNING id INTO locataire_id;
    RAISE NOTICE '✓ Locataire développement créé: locataire@test.com';
  ELSE
    SELECT id INTO locataire_id FROM auth.users WHERE email = 'locataire@test.com';
    RAISE NOTICE '✓ Locataire développement existe déjà: locataire@test.com';
  END IF;
  
  -- Propriétaire 1 (existe déjà mais on vérifie)
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'proprietaire1@test.com') INTO user_exists;
  IF NOT user_exists THEN
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
    ) RETURNING id INTO proprietaire1_id;
    RAISE NOTICE '✓ Propriétaire développement créé: proprietaire1@test.com';
  ELSE
    SELECT id INTO proprietaire1_id FROM auth.users WHERE email = 'proprietaire1@test.com';
    RAISE NOTICE '✓ Propriétaire développement existe déjà: proprietaire1@test.com';
  END IF;
  
  -- Agence 1 (existe déjà mais on vérifie)
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'agence1@test.com') INTO user_exists;
  IF NOT user_exists THEN
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
    ) RETURNING id INTO agence1_id;
    RAISE NOTICE '✓ Agence développement créée: agence1@test.com';
  ELSE
    SELECT id INTO agence1_id FROM auth.users WHERE email = 'agence1@test.com';
    RAISE NOTICE '✓ Agence développement existe déjà: agence1@test.com';
  END IF;
  
  -- Admin de développement
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'admin@test.com') INTO user_exists;
  IF NOT user_exists THEN
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
      'admin@test.com',
      NOW(),
      '+2250202020202',
      '{"full_name": "Administrateur ANSUT", "user_type": "admin"}',
      NOW(),
      NOW()
    ) RETURNING id INTO admin_id;
    RAISE NOTICE '✓ Admin développement créé: admin@test.com';
  ELSE
    SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@test.com';
    RAISE NOTICE '✓ Admin développement existe déjà: admin@test.com';
  END IF;
  
  -- Super Admin de développement
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'super@test.com') INTO user_exists;
  IF NOT user_exists THEN
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
      'super@test.com',
      NOW(),
      '+2250303030303',
      '{"full_name": "Super Administrateur", "user_type": "super_admin"}',
      NOW(),
      NOW()
    ) RETURNING id INTO super_admin_id;
    RAISE NOTICE '✓ Super Admin développement créé: super@test.com';
  ELSE
    SELECT id INTO super_admin_id FROM auth.users WHERE email = 'super@test.com';
    RAISE NOTICE '✓ Super Admin développement existe déjà: super@test.com';
  END IF;
  
  -- ===================================================================
  -- 2. COMPTES DE DÉMONSTRATION
  -- ===================================================================
  
  -- Locataire de démonstration
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'demo@locataire.ci') INTO user_exists;
  IF NOT user_exists THEN
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
      'demo@locataire.ci',
      NOW(),
      '+2250404040404',
      '{"full_name": "Demo Locataire", "user_type": "locataire"}',
      NOW(),
      NOW()
    ) RETURNING id INTO demo_locataire_id;
    RAISE NOTICE '✓ Locataire démo créé: demo@locataire.ci';
  ELSE
    SELECT id INTO demo_locataire_id FROM auth.users WHERE email = 'demo@locataire.ci';
    RAISE NOTICE '✓ Locataire démo existe déjà: demo@locataire.ci';
  END IF;
  
  -- Propriétaire de démonstration
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'demo@proprietaire.ci') INTO user_exists;
  IF NOT user_exists THEN
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
      'demo@proprietaire.ci',
      NOW(),
      '+2250505050505',
      '{"full_name": "Demo Propriétaire", "user_type": "proprietaire"}',
      NOW(),
      NOW()
    ) RETURNING id INTO demo_proprietaire_id;
    RAISE NOTICE '✓ Propriétaire démo créé: demo@proprietaire.ci';
  ELSE
    SELECT id INTO demo_proprietaire_id FROM auth.users WHERE email = 'demo@proprietaire.ci';
    RAISE NOTICE '✓ Propriétaire démo existe déjà: demo@proprietaire.ci';
  END IF;
  
  -- Agence de démonstration
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'demo@agence.ci') INTO user_exists;
  IF NOT user_exists THEN
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
      'demo@agence.ci',
      NOW(),
      '+2250606060606',
      '{"full_name": "Demo Agence", "user_type": "agence"}',
      NOW(),
      NOW()
    ) RETURNING id INTO demo_agence_id;
    RAISE NOTICE '✓ Agence démo créée: demo@agence.ci';
  ELSE
    SELECT id INTO demo_agence_id FROM auth.users WHERE email = 'demo@agence.ci';
    RAISE NOTICE '✓ Agence démo existe déjà: demo@agence.ci';
  END IF;
  
  -- ===================================================================
  -- 3. COMPTES DE STAGING
  -- ===================================================================
  
  -- Locataire de staging
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'staging@locataire.ci') INTO user_exists;
  IF NOT user_exists THEN
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
      'staging@locataire.ci',
      NOW(),
      '+2250707070707',
      '{"full_name": "Staging Locataire", "user_type": "locataire"}',
      NOW(),
      NOW()
    ) RETURNING id INTO staging_locataire_id;
    RAISE NOTICE '✓ Locataire staging créé: staging@locataire.ci';
  ELSE
    SELECT id INTO staging_locataire_id FROM auth.users WHERE email = 'staging@locataire.ci';
    RAISE NOTICE '✓ Locataire staging existe déjà: staging@locataire.ci';
  END IF;
  
  -- Propriétaire de staging
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'staging@proprietaire.ci') INTO user_exists;
  IF NOT user_exists THEN
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
      'staging@proprietaire.ci',
      NOW(),
      '+2250808080808',
      '{"full_name": "Staging Propriétaire", "user_type": "proprietaire"}',
      NOW(),
      NOW()
    ) RETURNING id INTO staging_proprietaire_id;
    RAISE NOTICE '✓ Propriétaire staging créé: staging@proprietaire.ci';
  ELSE
    SELECT id INTO staging_proprietaire_id FROM auth.users WHERE email = 'staging@proprietaire.ci';
    RAISE NOTICE '✓ Propriétaire staging existe déjà: staging@proprietaire.ci';
  END IF;
  
  -- Agence de staging
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'staging@agence.ci') INTO user_exists;
  IF NOT user_exists THEN
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
      'staging@agence.ci',
      NOW(),
      '+2250909090909',
      '{"full_name": "Staging Agence", "user_type": "agence"}',
      NOW(),
      NOW()
    ) RETURNING id INTO staging_agence_id;
    RAISE NOTICE '✓ Agence staging créée: staging@agence.ci';
  ELSE
    SELECT id INTO staging_agence_id FROM auth.users WHERE email = 'staging@agence.ci';
    RAISE NOTICE '✓ Agence staging existe déjà: staging@agence.ci';
  END IF;
  
  -- Vérifier combien de propriétés existent déjà
  SELECT COUNT(*) INTO property_count FROM public.properties;

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
      proprietaire1_id,
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
      proprietaire1_id,
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
      proprietaire1_id,
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
      proprietaire1_id,
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
      proprietaire1_id,
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
      agence1_id,
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
      agence1_id,
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
      agence1_id,
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

-- ===================================================================
-- 3. VÉRIFICATION ET RAPPORT COMPLET
-- ===================================================================

-- Rapport des données créées
SELECT '=== RAPPORT COMPLET DE CRÉATION DES DONNÉES ===' as rapport;

SELECT 'COMPTES DE DÉVELOPPEMENT CRÉÉS:' as section;
SELECT 
  u.id, 
  u.email, 
  p.full_name, 
  p.user_type,
  p.created_at
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE u.email IN (
  'locataire@test.com', 
  'proprietaire1@test.com', 
  'agence1@test.com', 
  'admin@test.com', 
  'super@test.com'
)
ORDER BY u.email;

SELECT 'COMPTES DE DÉMONSTRATION CRÉÉS:' as section;
SELECT 
  u.id, 
  u.email, 
  p.full_name, 
  p.user_type,
  p.created_at
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE u.email IN (
  'demo@locataire.ci', 
  'demo@proprietaire.ci', 
  'demo@agence.ci'
)
ORDER BY u.email;

SELECT 'COMPTES DE STAGING CRÉÉS:' as section;
SELECT 
  u.id, 
  u.email, 
  p.full_name, 
  p.user_type,
  p.created_at
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE u.email IN (
  'staging@locataire.ci', 
  'staging@proprietaire.ci', 
  'staging@agence.ci'
)
ORDER BY u.email;

SELECT 'RÔLES UTILISATEURS PAR TYPE:' as section;
SELECT 
  p.user_type,
  COUNT(*) as count,
  STRING_AGG(u.email, ', ') as users
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
GROUP BY p.user_type
ORDER BY count DESC;

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

SELECT '=== Seed complet exécuté avec succès ! ===' as rapport;
SELECT 'Comptes créés:' as info;
SELECT 'Développement (5 comptes):' as category;
SELECT '- locataire@test.com (Test123!) - Marie Konan' as user;
SELECT '- proprietaire1@test.com (Test123!) - Jean Kouadio' as user;
SELECT '- agence1@test.com (Test123!) - Agence Immobilière Abidjan' as user;
SELECT '- admin@test.com (Admin123!) - Administrateur ANSUT' as user;
SELECT '- super@test.com (Super123!) - Super Administrateur' as user;
SELECT '' as info;
SELECT 'Démonstration (3 comptes):' as category;
SELECT '- demo@locataire.ci (Demo2025!) - Demo Locataire' as user;
SELECT '- demo@proprietaire.ci (Demo2025!) - Demo Propriétaire' as user;
SELECT '- demo@agence.ci (Demo2025!) - Demo Agence' as user;
SELECT '' as info;
SELECT 'Staging (3 comptes):' as category;
SELECT '- staging@locataire.ci (Staging2025!) - Staging Locataire' as user;
SELECT '- staging@proprietaire.ci (Staging2025!) - Staging Propriétaire' as user;
SELECT '- staging@agence.ci (Staging2025!) - Staging Agence' as user;
SELECT '' as info;
SELECT 'Total comptes créés: 11' as info;
SELECT 'Total propriétés créées: 8' as info;
SELECT 'Répartition: 5 propriétés pour propriétaire individuel, 3 pour agence' as info;
