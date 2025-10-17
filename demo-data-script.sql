-- ============================================================================
-- SCRIPT DE DONNÉES DE DÉMONSTRATION - MON TOIT MARKETPLACE
-- ============================================================================
-- IMPORTANT: Remplacez les UUIDs ci-dessous par les vrais IDs après création des comptes
-- ============================================================================

-- VARIABLES À REMPLACER (utilisez les IDs de votre base après avoir créé les comptes)
-- Propriétaires:
--   PROP1_UUID = ID de Jean-Paul Kouassi
--   PROP2_UUID = ID de Marie Diabaté  
--   PROP3_UUID = ID de Ismaël Traoré
-- Agences:
--   AGENCE1_UUID = ID de Immobilier CI
--   AGENCE2_UUID = ID de Abidjan Prestige
-- Locataires:
--   LOC1_UUID à LOC10_UUID = IDs des 10 locataires
-- Admins:
--   ADMIN1_UUID, ADMIN2_UUID = IDs des admins

-- ============================================================================
-- 1. MISE À JOUR DES PROFILS (Bio, vérifications)
-- ============================================================================

-- Propriétaire 1: Jean-Paul Kouassi
UPDATE public.profiles 
SET bio = 'Propriétaire depuis 8 ans, spécialisé dans l''immobilier résidentiel haut de gamme à Cocody.',
    oneci_verified = true
WHERE full_name = 'Jean-Paul Kouassi';

-- Propriétaire 2: Marie Diabaté
UPDATE public.profiles 
SET bio = 'Investisseuse immobilière avec 4 biens diversifiés. Privilégie les relations de confiance avec mes locataires.',
    oneci_verified = true
WHERE full_name = 'Marie Diabaté';

-- Propriétaire 3: Ismaël Traoré
UPDATE public.profiles 
SET bio = 'Jeune investisseur passionné par l''immobilier moderne. 2 biens en location.'
WHERE full_name = 'Ismaël Traoré';

-- Agence 1: Immobilier CI
UPDATE public.profiles 
SET bio = 'Agence leader avec 15 ans d''expérience. Portefeuille de 50+ biens haut de gamme. Certification ANSUT garantie.',
    oneci_verified = true
WHERE full_name LIKE 'Immobilier CI%';

-- Agence 2: Abidjan Prestige Homes
UPDATE public.profiles 
SET bio = 'Spécialiste des locations moyennes et haut de gamme. Service personnalisé et suivi client premium.',
    oneci_verified = true
WHERE full_name LIKE 'Abidjan Prestige%';

-- ============================================================================
-- 2. RÔLES ADMIN (remplacer par les vrais UUIDs)
-- ============================================================================

-- REMPLACEZ 'UUID_ADMIN_1' et 'UUID_ADMIN_2' par les vrais IDs
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES 
-- ('UUID_ADMIN_1', 'super_admin'),
-- ('UUID_ADMIN_1', 'admin'),
-- ('UUID_ADMIN_2', 'admin');

-- ============================================================================
-- 3. PROPRIÉTÉS - PROPRIÉTAIRES INDIVIDUELS (9 biens)
-- IMPORTANT: Remplacer PROP1_UUID, PROP2_UUID, PROP3_UUID par les vrais IDs
-- ============================================================================

-- Jean-Paul Kouassi - 3 biens
-- Bien 1: Villa Cocody
INSERT INTO public.properties (
    owner_id, title, property_type, address, neighborhood, city, 
    monthly_rent, charges_amount, deposit_amount, bedrooms, bathrooms, surface_area,
    description, status, moderation_status, is_furnished, has_parking, has_ac, has_garden,
    latitude, longitude, main_image, images
) VALUES (
    'PROP1_UUID', -- REMPLACER
    'Villa Moderne 4 Chambres - Cocody Angré',
    'villa',
    'Angré 7ème Tranche, près de la pharmacie',
    'Angré',
    'Abidjan',
    450000,
    25000,
    900000,
    4,
    3,
    280,
    'Magnifique villa moderne de 280m² dans le quartier prisé d''Angré. Cuisine équipée, salon spacieux, jardin arboré, parking 3 voitures. Climatisation dans toutes les pièces. Sécurité 24/7.',
    'disponible',
    'approved',
    true,
    true,
    true,
    true,
    5.3725,
    -3.9825,
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
    ARRAY['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800']
);

-- Bien 2: Appartement Marcory
INSERT INTO public.properties (
    owner_id, title, property_type, address, neighborhood, city,
    monthly_rent, charges_amount, deposit_amount, bedrooms, bathrooms, surface_area,
    description, status, moderation_status, is_furnished, has_parking, has_ac,
    latitude, longitude, main_image
) VALUES (
    'PROP1_UUID', -- REMPLACER
    'Appartement 3 Pièces - Marcory Zone 4',
    'appartement',
    'Marcory Zone 4, Rue des Jardins',
    'Zone 4',
    'Abidjan',
    180000,
    15000,
    360000,
    2,
    1,
    85,
    'Bel appartement 3 pièces au 2ème étage, résidence sécurisée. Proche commerces et transports. Parking privé inclus.',
    'disponible',
    'approved',
    false,
    true,
    true,
    5.3166,
    -4.0127,
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'
);

-- Bien 3: Studio Plateau
INSERT INTO public.properties (
    owner_id, title, property_type, address, neighborhood, city,
    monthly_rent, charges_amount, deposit_amount, bedrooms, bathrooms, surface_area,
    description, status, moderation_status, is_furnished, has_parking, has_ac,
    latitude, longitude, main_image
) VALUES (
    'PROP1_UUID', -- REMPLACER
    'Studio Meublé - Plateau Centre Ville',
    'studio',
    'Plateau, Avenue Chardy',
    'Plateau',
    'Abidjan',
    120000,
    8000,
    240000,
    1,
    1,
    35,
    'Studio meublé idéal pour professionnel. Proche ministères et banques. Tout équipé, prêt à habiter.',
    'loue',
    'approved',
    true,
    false,
    true,
    5.3228,
    -4.0121,
    'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800'
);

-- Marie Diabaté - 4 biens
-- Bien 4: Duplex Riviera
INSERT INTO public.properties (
    owner_id, title, property_type, address, neighborhood, city,
    monthly_rent, charges_amount, deposit_amount, bedrooms, bathrooms, surface_area,
    description, status, moderation_status, is_furnished, has_parking, has_ac, has_garden,
    latitude, longitude, main_image, images
) VALUES (
    'PROP2_UUID', -- REMPLACER
    'Duplex Luxueux 5 Chambres - Riviera Palmeraie',
    'duplex',
    'Riviera Palmeraie, Résidence Les Cocotiers',
    'Palmeraie',
    'Abidjan',
    550000,
    30000,
    1100000,
    5,
    4,
    320,
    'Duplex d''exception avec terrasse panoramique. Piscine commune, salle de sport, gardiennage. Finitions haut de gamme.',
    'disponible',
    'approved',
    true,
    true,
    true,
    true,
    5.3598,
    -3.9720,
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
    ARRAY['https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800', 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800']
);

-- Bien 5: Villa Bingerville 1
INSERT INTO public.properties (
    owner_id, title, property_type, address, neighborhood, city,
    monthly_rent, charges_amount, deposit_amount, bedrooms, bathrooms, surface_area,
    description, status, moderation_status, is_furnished, has_parking, has_garden,
    latitude, longitude, main_image
) VALUES (
    'PROP2_UUID', -- REMPLACER
    'Villa Familiale - Bingerville',
    'villa',
    'Bingerville, Quartier Résidentiel',
    'Centre',
    'Bingerville',
    280000,
    15000,
    560000,
    3,
    2,
    180,
    'Villa familiale calme avec grand jardin. Parfait pour famille. École internationale à 5min.',
    'disponible',
    'approved',
    false,
    true,
    true,
    5.3550,
    -3.8917,
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800'
);

-- Bien 6: Villa Bingerville 2
INSERT INTO public.properties (
    owner_id, title, property_type, address, neighborhood, city,
    monthly_rent, charges_amount, deposit_amount, bedrooms, bathrooms, surface_area,
    description, status, moderation_status, is_furnished, has_parking,
    latitude, longitude, main_image
) VALUES (
    'PROP2_UUID', -- REMPLACER
    'Villa 4 Chambres avec Piscine - Bingerville',
    'villa',
    'Bingerville, Route d''Alépé',
    'Zone Verte',
    'Bingerville',
    350000,
    20000,
    700000,
    4,
    3,
    250,
    'Superbe villa avec piscine privée. Cadre verdoyant, très calme. Idéal pour télétravail.',
    'loue',
    'approved',
    false,
    true,
    5.3592,
    -3.8856,
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'
);

-- Bien 7: Appartement Yopougon
INSERT INTO public.properties (
    owner_id, title, property_type, address, neighborhood, city,
    monthly_rent, charges_amount, deposit_amount, bedrooms, bathrooms, surface_area,
    description, status, moderation_status, is_furnished, has_parking,
    latitude, longitude, main_image
) VALUES (
    'PROP2_UUID', -- REMPLACER
    'Appartement 2 Pièces - Yopougon Niangon',
    'appartement',
    'Niangon Sud, près du carrefour',
    'Niangon',
    'Abidjan',
    95000,
    8000,
    190000,
    1,
    1,
    55,
    'Appartement lumineux dans résidence récente. Proche marché et transport.',
    'disponible',
    'approved',
    false,
    true,
    5.3394,
    -4.0775,
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'
);

-- Ismaël Traoré - 2 biens
-- Bien 8: Villa Angré
INSERT INTO public.properties (
    owner_id, title, property_type, address, neighborhood, city,
    monthly_rent, charges_amount, deposit_amount, bedrooms, bathrooms, surface_area,
    description, status, moderation_status, is_furnished, has_parking, has_ac,
    latitude, longitude, main_image
) VALUES (
    'PROP3_UUID', -- REMPLACER
    'Villa Contemporaine - Angré 8ème Tranche',
    'villa',
    'Angré 8ème Tranche',
    'Angré',
    'Abidjan',
    380000,
    22000,
    760000,
    3,
    2,
    200,
    'Villa design moderne, construction récente. Architecture contemporaine, finitions soignées.',
    'disponible',
    'approved',
    true,
    true,
    true,
    5.3756,
    -3.9798,
    'https://images.unsplash.com/photo-1605146769289-440113cc3d00?w=800'
);

-- Bien 9: Appartement Abobo
INSERT INTO public.properties (
    owner_id, title, property_type, address, neighborhood, city,
    monthly_rent, charges_amount, deposit_amount, bedrooms, bathrooms, surface_area,
    description, status, moderation_status, is_furnished, has_parking,
    latitude, longitude, main_image
) VALUES (
    'PROP3_UUID', -- REMPLACER
    'Appartement Économique - Abobo Gare',
    'appartement',
    'Abobo Gare, Rue Principale',
    'Gare',
    'Abidjan',
    75000,
    5000,
    150000,
    1,
    1,
    45,
    'Appartement propre et fonctionnel. Idéal premier logement ou budget modeste.',
    'disponible',
    'approved',
    false,
    false,
    5.4253,
    -4.0209,
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'
);

-- ============================================================================
-- 4. PROPRIÉTÉS - AGENCES (9 biens)
-- IMPORTANT: Remplacer AGENCE1_UUID, AGENCE2_UUID par les vrais IDs
-- ============================================================================

-- Immobilier CI - 5 biens haut de gamme
-- Bien 10: Penthouse Cocody
INSERT INTO public.properties (
    owner_id, title, property_type, address, neighborhood, city,
    monthly_rent, charges_amount, deposit_amount, bedrooms, bathrooms, surface_area,
    description, status, moderation_status, is_furnished, has_parking, has_ac, has_garden,
    latitude, longitude, main_image, images
) VALUES (
    'AGENCE1_UUID', -- REMPLACER
    'Penthouse Premium Vue Lagune - Cocody',
    'appartement',
    'Cocody Riviera Golf, Tour Prestige',
    'Riviera Golf',
    'Abidjan',
    850000,
    50000,
    1700000,
    4,
    3,
    300,
    'Penthouse d''exception au dernier étage. Vue panoramique lagune. Conciergerie 24/7, piscine rooftop, salle de sport. Certifié ANSUT.',
    'disponible',
    'approved',
    true,
    true,
    true,
    false,
    5.3642,
    -3.9856,
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
    ARRAY['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800', 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=800', 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800']
);

-- Bien 11: Villa Deux Plateaux
INSERT INTO public.properties (
    owner_id, title, property_type, address, neighborhood, city,
    monthly_rent, charges_amount, deposit_amount, bedrooms, bathrooms, surface_area,
    description, status, moderation_status, is_furnished, has_parking, has_ac, has_garden,
    latitude, longitude, main_image, images
) VALUES (
    'AGENCE1_UUID', -- REMPLACER
    'Villa de Prestige - Deux Plateaux Vallon',
    'villa',
    'Deux Plateaux Vallon, Allée des Ambassades',
    'Vallon',
    'Abidjan',
    720000,
    40000,
    1440000,
    5,
    4,
    400,
    'Villa ambassade avec piscine chauffée, court de tennis, jardin tropical 800m². Personnel de maison inclus. Certification ANSUT.',
    'disponible',
    'approved',
    true,
    true,
    true,
    true,
    5.3513,
    -4.0084,
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800',
    ARRAY['https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800', 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800']
);

-- Bien 12: Appartement Riviera 3
INSERT INTO public.properties (
    owner_id, title, property_type, address, neighborhood, city,
    monthly_rent, charges_amount, deposit_amount, bedrooms, bathrooms, surface_area,
    description, status, moderation_status, is_furnished, has_parking, has_ac,
    latitude, longitude, main_image
) VALUES (
    'AGENCE1_UUID', -- REMPLACER
    'Appartement Standing - Riviera 3',
    'appartement',
    'Riviera 3, Résidence Le Phare',
    'Riviera 3',
    'Abidjan',
    320000,
    18000,
    640000,
    3,
    2,
    120,
    'Appartement haut standing, résidence neuve avec ascenseur. Cuisine américaine équipée, terrasse 20m².',
    'disponible',
    'approved',
    true,
    true,
    true,
    5.3578,
    -3.9756,
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800'
);

-- Bien 13: Duplex Cocody (Loué)
INSERT INTO public.properties (
    owner_id, title, property_type, address, neighborhood, city,
    monthly_rent, charges_amount, deposit_amount, bedrooms, bathrooms, surface_area,
    description, status, moderation_status, is_furnished, has_parking, has_ac,
    latitude, longitude, main_image
) VALUES (
    'AGENCE1_UUID', -- REMPLACER
    'Duplex Moderne - Cocody Danga',
    'duplex',
    'Cocody Danga Nord',
    'Danga',
    'Abidjan',
    480000,
    25000,
    960000,
    4,
    3,
    220,
    'Duplex spacieux dans quartier calme. Proche écoles internationales. Stationnement 2 voitures.',
    'loue',
    'approved',
    false,
    true,
    true,
    5.3489,
    -3.9912,
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800'
);

-- Bien 14: Villa Cocody (En maintenance)
INSERT INTO public.properties (
    owner_id, title, property_type, address, neighborhood, city,
    monthly_rent, charges_amount, deposit_amount, bedrooms, bathrooms, surface_area,
    description, status, moderation_status, is_furnished, has_parking, has_garden,
    latitude, longitude, main_image
) VALUES (
    'AGENCE1_UUID', -- REMPLACER
    'Villa Rénovation Complète - Cocody',
    'villa',
    'Cocody II Plateaux, Rue des Jardins',
    'II Plateaux',
    'Abidjan',
    400000,
    20000,
    800000,
    3,
    2,
    200,
    'Villa en cours de rénovation complète. Disponible dans 2 mois. Peinture neuve, plomberie refaite.',
    'maintenance',
    'approved',
    false,
    true,
    true,
    5.3545,
    -4.0023,
    'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800'
);

-- Abidjan Prestige Homes - 4 biens gamme moyenne
-- Bien 15: Appartement Marcory
INSERT INTO public.properties (
    owner_id, title, property_type, address, neighborhood, city,
    monthly_rent, charges_amount, deposit_amount, bedrooms, bathrooms, surface_area,
    description, status, moderation_status, is_furnished, has_parking, has_ac,
    latitude, longitude, main_image
) VALUES (
    'AGENCE2_UUID', -- REMPLACER
    'Appartement 3 Pièces - Marcory Remblais',
    'appartement',
    'Marcory Remblais, Avenue Gal De Gaulle',
    'Remblais',
    'Abidjan',
    165000,
    12000,
    330000,
    2,
    1,
    75,
    'Appartement bien situé, proche du centre commercial. Transport facile. Idéal jeune couple.',
    'disponible',
    'approved',
    false,
    true,
    true,
    5.3112,
    -4.0089,
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800'
);

-- Bien 16: Villa Koumassi
INSERT INTO public.properties (
    owner_id, title, property_type, address, neighborhood, city,
    monthly_rent, charges_amount, deposit_amount, bedrooms, bathrooms, surface_area,
    description, status, moderation_status, is_furnished, has_parking,
    latitude, longitude, main_image
) VALUES (
    'AGENCE2_UUID', -- REMPLACER
    'Villa 3 Chambres - Koumassi',
    'villa',
    'Koumassi Remblais',
    'Remblais',
    'Abidjan',
    210000,
    10000,
    420000,
    3,
    2,
    150,
    'Villa familiale quartier résidentiel calme. Jardin, espace parking.',
    'disponible',
    'approved',
    false,
    true,
    5.2969,
    -3.9547,
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'
);

-- Bien 17: Appartement Treichville
INSERT INTO public.properties (
    owner_id, title, property_type, address, neighborhood, city,
    monthly_rent, charges_amount, deposit_amount, bedrooms, bathrooms, surface_area,
    description, status, moderation_status, is_furnished, has_parking,
    latitude, longitude, main_image
) VALUES (
    'AGENCE2_UUID', -- REMPLACER
    'Appartement Centre Ville - Treichville',
    'appartement',
    'Treichville, Boulevard de la République',
    'Centre',
    'Abidjan',
    140000,
    10000,
    280000,
    2,
    1,
    65,
    'Appartement central, proche de tout. Commerce, transport, administration. Très bon rapport qualité-prix.',
    'loue',
    'approved',
    false,
    false,
    5.2991,
    -4.0178,
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'
);

-- Bien 18: Studio Adjamé (Pending modération)
INSERT INTO public.properties (
    owner_id, title, property_type, address, neighborhood, city,
    monthly_rent, charges_amount, deposit_amount, bedrooms, bathrooms, surface_area,
    description, status, moderation_status, is_furnished, has_parking,
    latitude, longitude, main_image
) VALUES (
    'AGENCE2_UUID', -- REMPLACER
    'Studio Meublé - Adjamé Liberté',
    'studio',
    'Adjamé Liberté',
    'Liberté',
    'Abidjan',
    85000,
    5000,
    170000,
    1,
    1,
    30,
    'Studio fraîchement rénové, meublé complet. Idéal étudiant ou jeune professionnel.',
    'disponible',
    'pending',
    true,
    false,
    5.3531,
    -4.0242,
    'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800'
);

-- ============================================================================
-- SUITE DU SCRIPT: Candidatures, Baux, Messages, etc.
-- Le script continue dans la partie 2...
-- ============================================================================
