-- ===================================================================
-- Script de Seed pour Supabase Mon Toit
-- À exécuter dans SQL Editor de Supabase avec SERVICE ROLE
-- ===================================================================

-- NOTE: Ce script doit être exécuté avec le service_role pour pouvoir
-- insérer des utilisateurs et des données avec les relations foreign key

-- ===================================================================
-- 1. CRÉATION DES UTILISATEURS DE TEST
-- ===================================================================

-- Les utilisateurs seront créés via l'auth Supabase, mais nous pouvons
-- utiliser des IDs UUID connus pour le développement

-- Insertion dans la table profiles (simule la création d'utilisateurs)
-- NOTE: Ces utilisateurs doivent d'abord être créés dans auth.users via le dashboard

DO $$
DECLARE
  -- UUIDs prédéfinis pour les utilisateurs de test
  admin_user_id UUID := '11111111-1111-1111-1111-111111111111';
  proprietaire1_id UUID := '22222222-2222-2222-2222-222222222222';
  proprietaire2_id UUID := '33333333-3333-3333-3333-333333333333';
  proprietaire3_id UUID := '44444444-4444-4444-4444-444444444444';
  locataire1_id UUID := '55555555-5555-5555-5555-555555555555';
  locataire2_id UUID := '66666666-6666-6666-6666-666666666666';
  agence_id UUID := '77777777-7777-7777-7777-777777777777';
  admin_ansut_id UUID := '88888888-8888-8888-8888-888888888888';
BEGIN
  -- Vérifier et créer les profils si les utilisateurs existent dans auth.users
  -- NOTE: Ces insertions ne fonctionnent que si les utilisateurs existent dans auth.users

  -- Admin système
  INSERT INTO public.profiles (id, full_name, user_type, phone, city, is_verified)
  SELECT admin_user_id, 'Admin Système', 'admin', '0102030405', 'Abidjan', true
  WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = admin_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- Propriétaires
  INSERT INTO public.profiles (id, full_name, user_type, phone, city, is_verified)
  SELECT proprietaire1_id, 'Jean Kouadio', 'proprietaire', '0601020304', 'Cocody', true
  WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = proprietaire1_id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, user_type, phone, city, is_verified)
  SELECT proprietaire2_id, 'Marie Konan', 'proprietaire', '0605060708', 'Plateau', true
  WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = proprietaire2_id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, user_type, phone, city, is_verified)
  SELECT proprietaire3_id, 'Yao Bamba', 'proprietaire', '0609080706', 'Yopougon', false
  WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = proprietaire3_id)
  ON CONFLICT (id) DO NOTHING;

  -- Locataires
  INSERT INTO public.profiles (id, full_name, user_type, phone, city, is_verified)
  SELECT locataire1_id, 'Fatima Traoré', 'locataire', '0712345678', 'Marcory', false
  WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = locataire1_id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, user_type, phone, city, is_verified)
  SELECT locataire2_id, 'Mohamed Sissoko', 'locataire', '0723456789', 'Abobo', false
  WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = locataire2_id)
  ON CONFLICT (id) DO NOTHING;

  -- Agence immobilière
  INSERT INTO public.profiles (id, full_name, user_type, phone, city, is_verified)
  SELECT agence_id, 'Immobilier CI', 'agence', '20212345', 'Cocody', true
  WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = agence_id)
  ON CONFLICT (id) DO NOTHING;

  -- Admin ANSUT
  INSERT INTO public.profiles (id, full_name, user_type, phone, city, is_verified)
  SELECT admin_ansut_id, 'Patrick Somet', 'admin_ansut', '20213456', 'Abidjan', true
  WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = admin_ansut_id)
  ON CONFLICT (id) DO NOTHING;

  -- Attribution des rôles
  INSERT INTO public.user_roles (user_id, role)
  SELECT admin_user_id, 'admin'
  WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = admin_user_id)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  SELECT admin_ansut_id, 'super_admin'
  WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = admin_ansut_id)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  SELECT admin_ansut_id, 'admin'
  WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = admin_ansut_id)
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'Utilisateurs de test créés avec succès';
  RAISE NOTICE 'UUIDs créés:';
  RAISE NOTICE '- Admin: %', admin_user_id;
  RAISE NOTICE '- Propriétaire 1: %', proprietaire1_id;
  RAISE NOTICE '- Propriétaire 2: %', proprietaire2_id;
  RAISE NOTICE '- Propriétaire 3: %', proprietaire3_id;
  RAISE NOTICE '- Locataire 1: %', locataire1_id;
  RAISE NOTICE '- Locataire 2: %', locataire2_id;
  RAISE NOTICE '- Agence: %', agence_id;
  RAISE NOTICE '- Admin ANSUT: %', admin_ansut_id;
END $$;

-- ===================================================================
-- 2. CRÉATION DES BIENS IMMOBILIERS
-- ===================================================================

-- Adaptation du script original avec les bonnes colonnes et UUIDs valides
DO $$
DECLARE
  -- Utiliser le premier propriétaire comme owner_id par défaut
  default_owner_id UUID := '22222222-2222-2222-2222-222222222222';
  property_count INTEGER;
BEGIN
  -- Vérifier combien de propriétés existent déjà
  SELECT COUNT(*) INTO property_count FROM public.properties;

  IF property_count = 0 THEN
    -- Insérer 8 biens de test pour Abidjan avec le bon format de colonnes
    INSERT INTO public.properties (
      owner_id, title, description, property_type, status,
      address, city, neighborhood, latitude, longitude,
      bedrooms, bathrooms, surface_area, monthly_rent, deposit_amount,
      is_furnished, has_parking, has_garden, has_ac,
      main_image, images, moderation_status
    ) VALUES
    (
      default_owner_id,
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
      default_owner_id,
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
      '33333333-3333-3333-3333-333333333333',
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
      '33333333-3333-3333-3333-333333333333',
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
      '22222222-2222-2222-2222-222222222222',
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
      '44444444-4444-4444-4444-444444444444',
      'Maison 3 Chambres - Abobo',
      'Maison familiale avec 3 chambres, salon, cuisine, cour. Quartier populaire et animé.',
      'maison',
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
      '22222222-2222-2222-2222-222222222222',
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
        'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'
      ],
      'approved'
    ),
    (
      '33333333-3333-3333-3333-333333333333',
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

    RAISE NOTICE '8 propriétés de test insérées avec succès';
  ELSE
    RAISE NOTICE 'Des propriétés existent déjà (% propriétés), insertion des données de test annulée', property_count;
  END IF;
END $$;

-- ===================================================================
-- 3. CRÉATION DES DEMANDES DE LOCATION
-- ===================================================================

DO $$
DECLARE
  application_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO application_count FROM public.rental_applications;

  IF application_count = 0 THEN
    -- Créer quelques demandes de location de test
    INSERT INTO public.rental_applications (
      applicant_id, property_id, status, message, monthly_income, employment_status,
      move_in_date, duration_months, number_of_people, has_pets, created_at
    ) VALUES
    (
      '55555555-5555-5555-5555-555555555555', -- Fatima Traoré
      (SELECT id FROM public.properties WHERE title = 'Studio Meublé - Marcory' LIMIT 1),
      'pending',
      'Je suis une jeune professionnelle à la recherche d''un studio meublé pour moi-même. Je suis fiable et solvable.',
      150000,
      'employed',
      CURRENT_DATE + INTERVAL '1 month',
      12,
      1,
      false,
      NOW()
    ),
    (
      '66666666-6666-6666-6666-666666666666', -- Mohamed Sissoko
      (SELECT id FROM public.properties WHERE title = 'Appartement 2 Pièces - Treichville' LIMIT 1),
      'pending',
      'Je suis à la recherche d''un logement pour ma famille. Je travaille dans le transport et mes revenus sont stables.',
      200000,
      'employed',
      CURRENT_DATE + INTERVAL '2 weeks',
      12,
      2,
      false,
      NOW()
    );

    RAISE NOTICE 'Demandes de location créées avec succès';
  END IF;
END $$;

-- ===================================================================
-- 4. CRÉATION DES FAVORIS
-- ===================================================================

DO $$
DECLARE
  favorites_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO favorites_count FROM public.user_favorites;

  IF favorites_count = 0 THEN
    -- Ajouter quelques favoris
    INSERT INTO public.user_favorites (user_id, property_id)
    SELECT '55555555-5555-5555-5555-555555555555', id FROM public.properties WHERE property_type IN ('studio', 'appartement') LIMIT 3;

    INSERT INTO public.user_favorites (user_id, property_id)
    SELECT '66666666-6666-6666-6666-666666666666', id FROM public.properties WHERE monthly_rent <= 200000 LIMIT 2;

    RAISE NOTICE 'Favoris créés avec succès';
  END IF;
END $$;

-- ===================================================================
-- 5. VÉRIFICATION ET RAPPORT
-- ===================================================================

-- Rapport des données créées
SELECT '=== RAPPORT DE CRÉATION DES DONNÉES ===' as rapport;

SELECT 'UTILISATEURS CRÉÉS:' as section;
SELECT user_type, COUNT(*) as count
FROM public.profiles
GROUP BY user_type;

SELECT 'PROPRIÉTÉS CRÉÉES:' as section;
SELECT property_type, COUNT(*) as count, AVG(monthly_rent) as avg_rent
FROM public.properties
GROUP BY property_type;

SELECT 'DEMANDES DE LOCATION:' as section;
SELECT status, COUNT(*) as count
FROM public.rental_applications
GROUP BY status;

SELECT 'Favoris:' as section;
SELECT COUNT(*) as total_favorites
FROM public.user_favorites;

-- Afficher quelques propriétés pour vérification
SELECT '=== 5 PREMIÈRES PROPRIÉTÉS ===' as section;
SELECT id, title, property_type, city, monthly_rent, moderation_status
FROM public.properties
ORDER BY created_at DESC
LIMIT 5;

SELECT '=== Seed créé avec succès! ===' as rapport;
RAISE NOTICE '=== RAPPORT FINAL ===';
RAISE NOTICE 'Base de données peuplée avec les données de test suivantes:';
RAISE NOTICE '- Utilisateurs: Admin, propriétaires, locataires, agence, admin ANSUT';
RAISE NOTICE '- Propriétés: 8 biens immobiliers répartis sur Abidjan';
RAISE NOTICE '- Demandes de location: 2 demandes en attente';
RAISE NOTICE '- Favoris: Quelques favoris créés';
RAISE NOTICE '';
RAISE NOTICE 'Pour créer les utilisateurs authentifiés correspondants, utilisez le dashboard Supabase';
RAISE NOTICE 'et copiez les UUIDs affichés ci-dessus pour créer les utilisateurs avec ces IDs exacts.';