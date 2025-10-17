-- Script de seed pour Supabase Mon Toit
-- À exécuter dans SQL Editor de Supabase

-- Insérer 8 biens de test pour Abidjan
INSERT INTO public.properties (
  title, description, price, type, bedrooms, bathrooms, surface,
  address, city, latitude, longitude, images, amenities, available, certified_ansut
) VALUES
(
  'Villa Moderne 4 Chambres - Cocody',
  'Magnifique villa moderne avec 4 chambres, salon spacieux, cuisine équipée, jardin et piscine. Située dans un quartier calme et sécurisé de Cocody.',
  450000,
  'villa',
  4,
  3,
  250,
  'Cocody, Riviera Golf',
  'Abidjan',
  5.3599517,
  -3.9810128,
  ARRAY[
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'
  ],
  ARRAY['piscine', 'jardin', 'parking', 'securite', 'climatisation'],
  true,
  true
),
(
  'Appartement 3 Pièces - Plateau',
  'Bel appartement de 3 pièces au cœur du Plateau, proche de tous commerces et transports. Vue imprenable sur la ville.',
  250000,
  'appartement',
  2,
  1,
  85,
  'Plateau, Avenue Franchet d''Esperey',
  'Abidjan',
  5.3266155,
  -4.0083155,
  ARRAY[
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'
  ],
  ARRAY['parking', 'climatisation', 'ascenseur'],
  true,
  true
),
(
  'Studio Meublé - Marcory',
  'Studio moderne entièrement meublé et équipé, idéal pour jeune professionnel. Proche de la zone 4.',
  120000,
  'studio',
  1,
  1,
  35,
  'Marcory, Zone 4',
  'Abidjan',
  5.2892436,
  -3.9810128,
  ARRAY[
    'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800'
  ],
  ARRAY['meuble', 'climatisation'],
  true,
  false
),
(
  'Duplex 5 Chambres - Yopougon',
  'Grand duplex de 5 chambres avec terrasse, parfait pour famille nombreuse. Quartier résidentiel calme.',
  350000,
  'duplex',
  5,
  3,
  180,
  'Yopougon, Niangon Nord',
  'Abidjan',
  5.3364449,
  -4.0890556,
  ARRAY[
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800'
  ],
  ARRAY['jardin', 'parking', 'securite'],
  true,
  true
),
(
  'Appartement Standing - Cocody',
  'Appartement haut standing avec finitions luxueuses, dans résidence sécurisée avec piscine commune.',
  380000,
  'appartement',
  3,
  2,
  120,
  'Cocody, Angré 8ème Tranche',
  'Abidjan',
  5.3964912,
  -3.9810128,
  ARRAY[
    'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800',
    'https://images.unsplash.com/photo-1600566753151-384129cf4e3e?w=800'
  ],
  ARRAY['piscine', 'parking', 'securite', 'climatisation', 'ascenseur'],
  true,
  true
),
(
  'Maison 3 Chambres - Abobo',
  'Maison familiale avec 3 chambres, salon, cuisine, cour. Quartier populaire et animé.',
  180000,
  'maison',
  3,
  2,
  100,
  'Abobo, Avocatier',
  'Abidjan',
  5.4167,
  -4.0167,
  ARRAY[
    'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800'
  ],
  ARRAY['jardin', 'parking'],
  true,
  false
),
(
  'Villa de Luxe - Cocody',
  'Villa de prestige avec 6 chambres, piscine, jardin paysager, garage 3 voitures. Sécurité 24/7.',
  850000,
  'villa',
  6,
  5,
  400,
  'Cocody, Riviera Palmeraie',
  'Abidjan',
  5.3599517,
  -3.9610128,
  ARRAY[
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'
  ],
  ARRAY['piscine', 'jardin', 'parking', 'securite', 'climatisation', 'meuble'],
  true,
  true
),
(
  'Appartement 2 Pièces - Treichville',
  'Appartement lumineux de 2 pièces, proche du marché et des transports. Idéal premier achat.',
  150000,
  'appartement',
  1,
  1,
  55,
  'Treichville, Boulevard de Marseille',
  'Abidjan',
  5.2892436,
  -4.0083155,
  ARRAY[
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'
  ],
  ARRAY['climatisation'],
  true,
  false
);

-- Vérifier le nombre de biens insérés
SELECT COUNT(*) as total_properties FROM public.properties;

-- Afficher les biens insérés
SELECT id, title, price, type, city, certified_ansut FROM public.properties ORDER BY created_at DESC;

