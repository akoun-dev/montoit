-- 1. Appartement à Deux Plateaux (Abidjan)
INSERT INTO "public"."properties" (
  "id", "owner_id", "title", "description", "property_type", "status",
  "address", "coordinates", "latitude", "longitude", "city", "neighborhood",
  "surface_area", "rooms", "bedrooms", "bathrooms", "floor_number", "furnished",
  "has_parking", "has_garden", "has_ac", "has_elevator", "year_built",
  "price", "deposit_amount", "charges_included", "charges_amount", "available_from",
  "minimum_lease_months", "available_for_visits", "images", "video_tour_url",
  "virtual_tour_url", "features", "amenities", "is_anonymous", "is_public",
  "is_verified", "featured", "views_count", "favorites_count", "applications_count",
  "property_code", "external_references", "created_at", "updated_at", "last_viewed_at",
  "property_category", "main_image", "ansut_verified", "ansut_verification_date",
  "ansut_certificate_url", "managed_by_agency", "status_updated_at", "status_reason",
  "custom_equipment"
) VALUES (
  gen_random_uuid(), '35d0e00a-04ec-4308-99b8-cdc2ec9e0f7f',
  'Appartement 3 pièces - Deux Plateaux Vallon',
  'Appartement lumineux de 95 m² au 2e étage, composé d’un salon, deux chambres, cuisine américaine équipée, salle de bain, balcon. Parking privé et gardiennage 24h/24.',
  'apartment', 'available', '"Deux Plateaux Vallon"', '{}', 5.362236, -3.995431,
  'Abidjan', 'Deux Plateaux', '95', '3', '2', '1', '2', 'true',
  'true', 'false', 'true', 'true', 2018,
  '120', '150', 'false', '0', NULL, '12', 'true',
  '["http://127.0.0.1:54321/storage/v1/object/public/property-images/2plateaux/image1.png"]',
  NULL, NULL, '{}', '[]', 'true', 'true', 'true', 'false', '0', '0', '0',
  NULL, '{}', NOW(), NOW(), NULL, 'residential',
  'http://127.0.0.1:54321/storage/v1/object/public/property-images/2plateaux/image1.png',
  'true', NOW(), NULL, NULL, NULL, NULL, '[]'
);

-- 2. Villa à Cocody Angré (Abidjan)
INSERT INTO "public"."properties" (
  "id", "owner_id", "title", "description", "property_type", "status",
  "address", "coordinates", "latitude", "longitude", "city", "neighborhood",
  "surface_area", "rooms", "bedrooms", "bathrooms", "floor_number", "furnished",
  "has_parking", "has_garden", "has_ac", "has_elevator", "year_built",
  "price", "deposit_amount", "charges_included", "charges_amount", "available_from",
  "minimum_lease_months", "available_for_visits", "images", "video_tour_url",
  "virtual_tour_url", "features", "amenities", "is_anonymous", "is_public",
  "is_verified", "featured", "views_count", "favorites_count", "applications_count",
  "property_code", "external_references", "created_at", "updated_at", "last_viewed_at",
  "property_category", "main_image", "ansut_verified", "ansut_verification_date",
  "ansut_certificate_url", "managed_by_agency", "status_updated_at", "status_reason",
  "custom_equipment"
) VALUES (
  gen_random_uuid(), '35d0e00a-04ec-4308-99b8-cdc2ec9e0f7f',
  'Villa 6 chambres - Cocody Angré',
  'Magnifique villa sur 400 m² de terrain, piscine, jardin tropical, 6 chambres dont 3 suites, cuisine équipée, buanderie, garage 3 voitures, climatisation réversible.',
  'house', 'available', '"Cocody Angré"', '{}', 5.355052, -3.969293,
  'Abidjan', 'Cocody', '400', '6', '6', '4', NULL, 'true',
  'true', 'true', 'true', 'false', 2015,
  '450', '800', 'false', '0', NULL, '24', 'true',
  '["http://127.0.0.1:54321/storage/v1/object/public/property-images/cocody-angre/image1.png"]',
  NULL, NULL, '{}', '[]', 'true', 'true', 'true', 'false', '0', '0', '0',
  NULL, '{}', NOW(), NOW(), NULL, 'residential',
  'http://127.0.0.1:54321/storage/v1/object/public/property-images/cocody-angre/image1.png',
  'true', NOW(), NULL, NULL, NULL, NULL, '[]'
);

-- 3. Studio meublé à Yopougon (Abidjan)
INSERT INTO "public"."properties" (
  "id", "owner_id", "title", "description", "property_type", "status",
  "address", "coordinates", "latitude", "longitude", "city", "neighborhood",
  "surface_area", "rooms", "bedrooms", "bathrooms", "floor_number", "furnished",
  "has_parking", "has_garden", "has_ac", "has_elevator", "year_built",
  "price", "deposit_amount", "charges_included", "charges_amount", "available_from",
  "minimum_lease_months", "available_for_visits", "images", "video_tour_url",
  "virtual_tour_url", "features", "amenities", "is_anonymous", "is_public",
  "is_verified", "featured", "views_count", "favorites_count", "applications_count",
  "property_code", "external_references", "created_at", "updated_at", "last_viewed_at",
  "property_category", "main_image", "ansut_verified", "ansut_verification_date",
  "ansut_certificate_url", "managed_by_agency", "status_updated_at", "status_reason",
  "custom_equipment"
) VALUES (
  gen_random_uuid(), '35d0e00a-04ec-4308-99b8-cdc2ec9e0f7f',
  'Studio meublé - Yopougon Sicogi',
  'Studio moderne de 32 m² entièrement meublé, idéal pour étudiant ou jeune actif. Clim, salle de bain privative, cuisine équipée, place de parking sécurisée.',
  'apartment', 'available', '"Yopougon Sicogi"', '{}', 5.328496, -4.069848,
  'Abidjan', 'Yopougon', '32', '1', '1', '1', '3', 'true',
  'true', 'false', 'true', 'true', 2022,
  '75', '100', 'false', '0', NULL, '6', 'true',
  '["http://127.0.0.1:54321/storage/v1/object/public/property-images/yopougon/studio.jpg"]',
  NULL, NULL, '{}', '[]', 'true', 'true', 'true', 'false', '0', '0', '0',
  NULL, '{}', NOW(), NOW(), NULL, 'residential',
  'http://127.0.0.1:54321/storage/v1/object/public/property-images/yopougon/studio.jpg',
  'true', NOW(), NULL, NULL, NULL, NULL, '[]'
);

-- 4. Duplex à Riviera Golf (Abidjan)
INSERT INTO "public"."properties" (
  "id", "owner_id", "title", "description", "property_type", "status",
  "address", "coordinates", "latitude", "longitude", "city", "neighborhood",
  "surface_area", "rooms", "bedrooms", "bathrooms", "floor_number", "furnished",
  "has_parking", "has_garden", "has_ac", "has_elevator", "year_built",
  "price", "deposit_amount", "charges_included", "charges_amount", "available_from",
  "minimum_lease_months", "available_for_visits", "images", "video_tour_url",
  "virtual_tour_url", "features", "amenities", "is_anonymous", "is_public",
  "is_verified", "featured", "views_count", "favorites_count", "applications_count",
  "property_code", "external_references", "created_at", "updated_at", "last_viewed_at",
  "property_category", "main_image", "ansut_verified", "ansut_verification_date",
  "ansut_certificate_url", "managed_by_agency", "status_updated_at", "status_reason",
  "custom_equipment"
) VALUES (
  gen_random_uuid(), '35d0e00a-04ec-4308-99b8-cdc2ec9e0f7f',
  'Duplex 4 chambres - Riviera Golf',
  'Superbe duplex de 220 m² avec terrasse, 4 chambres, 3 salles de bain, grand salon, cuisine ouverte, jardin privatif et piscine commune.',
  'house', 'available', '"Riviera Golf"', '{}', 5.347826, -3.973408,
  'Abidjan', 'Riviera', '220', '5', '4', '3', NULL, 'true',
  'true', 'true', 'true', 'false', 2021,
  '320', '450', 'false', '0', NULL, '12', 'true',
  '["http://127.0.0.1:54321/storage/v1/object/public/property-images/riviera/duplex.jpg"]',
  NULL, NULL, '{}', '[]', 'true', 'true', 'true', 'false', '0', '0', '0',
  NULL, '{}', NOW(), NOW(), NULL, 'residential',
  'http://127.0.0.1:54321/storage/v1/object/public/property-images/riviera/duplex.jpg',
  'true', NOW(), NULL, NULL, NULL, NULL, '[]'
);

-- 5. Appartement à Plateau (Abidjan)
INSERT INTO "public"."properties" (
  "id", "owner_id", "title", "description", "property_type", "status",
  "address", "coordinates", "latitude", "longitude", "city", "neighborhood",
  "surface_area", "rooms", "bedrooms", "bathrooms", "floor_number", "furnished",
  "has_parking", "has_garden", "has_ac", "has_elevator", "year_built",
  "price", "deposit_amount", "charges_included", "charges_amount", "available_from",
  "minimum_lease_months", "available_for_visits", "images", "video_tour_url",
  "virtual_tour_url", "features", "amenities", "is_anonymous", "is_public",
  "is_verified", "featured", "views_count", "favorites_count", "applications_count",
  "property_code", "external_references", "created_at", "updated_at", "last_viewed_at",
  "property_category", "main_image", "ansut_verified", "ansut_verification_date",
  "ansut_certificate_url", "managed_by_agency", "status_updated_at", "status_reason",
  "custom_equipment"
) VALUES (
  gen_random_uuid(), '35d0e00a-04ec-4308-99b8-cdc2ec9e0f7f',
  'Appartement F3 - Plateau',
  'Appartement de 110 m² au 8e étage avec vue panoramique, 3 chambres, salon, salle à manger, cuisine équipée, 2 salles de bain, parking sécurisé.',
  'apartment', 'available', '"Plateau"', '{}', 5.317807, -4.014525,
  'Abidjan', 'Plateau', '110', '4', '3', '2', '8', 'false',
  'true', 'false', 'true', 'true', 2012,
  '180', '250', 'false', '0', NULL, '12', 'true',
  '["http://127.0.0.1:54321/storage/v1/object/public/property-images/plateau/f3.jpg"]',
  NULL, NULL, '{}', '[]', 'true', 'true', 'true', 'false', '0', '0', '0',
  NULL, '{}', NOW(), NOW(), NULL, 'residential',
  'http://127.0.0.1:54321/storage/v1/object/public/property-images/plateau/f3.jpg',
  'true', NOW(), NULL, NULL, NULL, NULL, '[]'
);

-- 6. Maison de standing à Grand-Bassam (hors Abidjan)
INSERT INTO "public"."properties" (
  "id", "owner_id", "title", "description", "property_type", "status",
  "address", "coordinates", "latitude", "longitude", "city", "neighborhood",
  "surface_area", "rooms", "bedrooms", "bathrooms", "floor_number", "furnished",
  "has_parking", "has_garden", "has_ac", "has_elevator", "year_built",
  "price", "deposit_amount", "charges_included", "charges_amount", "available_from",
  "minimum_lease_months", "available_for_visits", "images", "video_tour_url",
  "virtual_tour_url", "features", "amenities", "is_anonymous", "is_public",
  "is_verified", "featured", "views_count", "favorites_count", "applications_count",
  "property_code", "external_references", "created_at", "updated_at", "last_viewed_at",
  "property_category", "main_image", "ansut_verified", "ansut_verification_date",
  "ansut_certificate_url", "managed_by_agency", "status_updated_at", "status_reason",
  "custom_equipment"
) VALUES (
  gen_random_uuid(), '35d0e00a-04ec-4308-99b8-cdc2ec9e0f7f',
  'Villa moderne - Grand-Bassam',
  'Magnifique villa de 300 m² sur terrain paysager, 5 chambres, piscine, grande terrasse, climatisation, parking. À 5 min de la plage.',
  'house', 'available', '"Grand-Bassam"', '{}', 5.184340, -3.731510,
  'Grand-Bassam', 'Village', '300', '5', '5', '4', NULL, 'true',
  'true', 'true', 'true', 'false', 2022,
  '280', '400', 'false', '0', NULL, '12', 'true',
  '["http://127.0.0.1:54321/storage/v1/object/public/property-images/gbassam/villa.jpg"]',
  NULL, NULL, '{}', '[]', 'true', 'true', 'true', 'false', '0', '0', '0',
  NULL, '{}', NOW(), NOW(), NULL, 'residential',
  'http://127.0.0.1:54321/storage/v1/object/public/property-images/gbassam/villa.jpg',
  'true', NOW(), NULL, NULL, NULL, NULL, '[]'
);

-- 7. Terrain de prestige à Assinie (hors Abidjan)
INSERT INTO "public"."properties" (
  "id", "owner_id", "title", "description", "property_type", "status",
  "address", "coordinates", "latitude", "longitude", "city", "neighborhood",
  "surface_area", "rooms", "bedrooms", "bathrooms", "floor_number", "furnished",
  "has_parking", "has_garden", "has_ac", "has_elevator", "year_built",
  "price", "deposit_amount", "charges_included", "charges_amount", "available_from",
  "minimum_lease_months", "available_for_visits", "images", "video_tour_url",
  "virtual_tour_url", "features", "amenities", "is_anonymous", "is_public",
  "is_verified", "featured", "views_count", "favorites_count", "applications_count",
  "property_code", "external_references", "created_at", "updated_at", "last_viewed_at",
  "property_category", "main_image", "ansut_verified", "ansut_verification_date",
  "ansut_certificate_url", "managed_by_agency", "status_updated_at", "status_reason",
  "custom_equipment"
) VALUES (
  gen_random_uuid(), '35d0e00a-04ec-4308-99b8-cdc2ec9e0f7f',
  'Terrain vue mer - Assinie',
  'Superbe terrain de 1200 m² à Assinie, à quelques pas de la plage. Idéal pour construire une villa de vacances. Documents en règle.',
  'land', 'available', '"Assinie"', '{}', 5.122970, -3.344580,
  'Assinie', 'Mafia', '1200', '0', '0', '0', NULL, 'false',
  'false', 'false', 'false', 'false', NULL,
  '90', '0', 'false', '0', NULL, '0', 'true',
  '["http://127.0.0.1:54321/storage/v1/object/public/property-images/assinie/terrain.jpg"]',
  NULL, NULL, '{}', '[]', 'true', 'true', 'true', 'false', '0', '0', '0',
  NULL, '{}', NOW(), NOW(), NULL, 'land',
  'http://127.0.0.1:54321/storage/v1/object/public/property-images/assinie/terrain.jpg',
  'true', NOW(), NULL, NULL, NULL, NULL, '[]'
);

-- 8. Appartement moderne à Bouaké (hors Abidjan)
INSERT INTO "public"."properties" (
  "id", "owner_id", "title", "description", "property_type", "status",
  "address", "coordinates", "latitude", "longitude", "city", "neighborhood",
  "surface_area", "rooms", "bedrooms", "bathrooms", "floor_number", "furnished",
  "has_parking", "has_garden", "has_ac", "has_elevator", "year_built",
  "price", "deposit_amount", "charges_included", "charges_amount", "available_from",
  "minimum_lease_months", "available_for_visits", "images", "video_tour_url",
  "virtual_tour_url", "features", "amenities", "is_anonymous", "is_public",
  "is_verified", "featured", "views_count", "favorites_count", "applications_count",
  "property_code", "external_references", "created_at", "updated_at", "last_viewed_at",
  "property_category", "main_image", "ansut_verified", "ansut_verification_date",
  "ansut_certificate_url", "managed_by_agency", "status_updated_at", "status_reason",
  "custom_equipment"
) VALUES (
  gen_random_uuid(), '35d0e00a-04ec-4308-99b8-cdc2ec9e0f7f',
  'Appartement 3 pièces - Bouaké',
  'Appartement de 90 m² au centre-ville, 2 chambres, salon, cuisine équipée, climatisation, parking sécurisé. Idéal pour famille.',
  'apartment', 'available', '"Bouaké"', '{}', 7.694358, -5.033253,
  'Bouaké', 'Centre', '90', '3', '2', '1', '3', 'true',
  'true', 'false', 'true', 'false', 2019,
  '95', '120', 'false', '0', NULL, '12', 'true',
  '["http://127.0.0.1:54321/storage/v1/object/public/property-images/bouake/appart.jpg"]',
  NULL, NULL, '{}', '[]', 'true', 'true', 'true', 'false', '0', '0', '0',
  NULL, '{}', NOW(), NOW(), NULL, 'residential',
  'http://127.0.0.1:54321/storage/v1/object/public/property-images/bouake/appart.jpg',
  'true', NOW(), NULL, NULL, NULL, NULL, '[]'
);

-- 9. Villa contemporaine à San Pedro (hors Abidjan)
INSERT INTO "public"."properties" (
  "id", "owner_id", "title", "description", "property_type", "status",
  "address", "coordinates", "latitude", "longitude", "city", "neighborhood",
  "surface_area", "rooms", "bedrooms", "bathrooms", "floor_number", "furnished",
  "has_parking", "has_garden", "has_ac", "has_elevator", "year_built",
  "price", "deposit_amount", "charges_included", "charges_amount", "available_from",
  "minimum_lease_months", "available_for_visits", "images", "video_tour_url",
  "virtual_tour_url", "features", "amenities", "is_anonymous", "is_public",
  "is_verified", "featured", "views_count", "favorites_count", "applications_count",
  "property_code", "external_references", "created_at", "updated_at", "last_viewed_at",
  "property_category", "main_image", "ansut_verified", "ansut_verification_date",
  "ansut_certificate_url", "managed_by_agency", "status_updated_at", "status_reason",
  "custom_equipment"
) VALUES (
  gen_random_uuid(), '35d0e00a-04ec-4308-99b8-cdc2ec9e0f7f',
  'Villa 4 chambres - San Pedro',
  'Jolie villa de 200 m² dans un quartier résidentiel, 4 chambres, grand salon, cuisine équipée, jardin, parking, climatisation.',
  'house', 'available', '"San Pedro"', '{}', 4.751159, -6.640003,
  'San Pedro', 'Résidentiel', '200', '5', '4', '3', NULL, 'true',
  'true', 'true', 'true', 'false', 2018,
  '160', '200', 'false', '0', NULL, '12', 'true',
  '["http://127.0.0.1:54321/storage/v1/object/public/property-images/sanpedro/villa.jpg"]',
  NULL, NULL, '{}', '[]', 'true', 'true', 'true', 'false', '0', '0', '0',
  NULL, '{}', NOW(), NOW(), NULL, 'residential',
  'http://127.0.0.1:54321/storage/v1/object/public/property-images/sanpedro/villa.jpg',
  'true', NOW(), NULL, NULL, NULL, NULL, '[]'
);

-- 10. Maison de ville à Yamoussoukro (hors Abidjan)
INSERT INTO "public"."properties" (
  "id", "owner_id", "title", "description", "property_type", "status",
  "address", "coordinates", "latitude", "longitude", "city", "neighborhood",
  "surface_area", "rooms", "bedrooms", "bathrooms", "floor_number", "furnished",
  "has_parking", "has_garden", "has_ac", "has_elevator", "year_built",
  "price", "deposit_amount", "charges_included", "charges_amount", "available_from",
  "minimum_lease_months", "available_for_visits", "images", "video_tour_url",
  "virtual_tour_url", "features", "amenities", "is_anonymous", "is_public",
  "is_verified", "featured", "views_count", "favorites_count", "applications_count",
  "property_code", "external_references", "created_at", "updated_at", "last_viewed_at",
  "property_category", "main_image", "ansut_verified", "ansut_verification_date",
  "ansut_certificate_url", "managed_by_agency", "status_updated_at", "status_reason",
  "custom_equipment"
) VALUES (
  gen_random_uuid(), '35d0e00a-04ec-4308-99b8-cdc2ec9e0f7f',
  'Maison de ville - Yamoussoukro',
  'Maison R+1 de 180 m², 4 chambres, salon, cuisine, 2 salles de bain, petit jardin, parking, climatisation. Quartier calme.',
  'house', 'available', '"Yamoussoukro"', '{}', 6.816518, -5.270555,
  'Yamoussoukro', 'Quartier Administratif', '180', '5', '4', '2', NULL, 'true',
  'true', 'true', 'true', 'false', 2016,
  '120', '150', 'false', '0', NULL, '12', 'true',
  '["http://127.0.0.1:54321/storage/v1/object/public/property-images/yamoussoukro/maison.jpg"]',
  NULL, NULL, '{}', '[]', 'true', 'true', 'true', 'false', '0', '0', '0',
  NULL, '{}', NOW(), NOW(), NULL, 'residential',
  'http://127.0.0.1:54321/storage/v1/object/public/property-images/yamoussoukro/maison.jpg',
  'true', NOW(), NULL, NULL, NULL, NULL, '[]'
);