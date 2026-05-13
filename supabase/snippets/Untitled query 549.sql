INSERT INTO public.properties (
    owner_id,
    title,
    description,
    property_type,
    status,
    city,
    neighborhood,
    surface_area,
    rooms,
    bedrooms,
    bathrooms,
    price,
    created_at
)
SELECT
    '74b92792-a938-4c7b-a17d-25260376ffe1'::uuid,
    (
        ARRAY[
            'Studio moderne à Cocody Angré',
            'Appartement 2 pièces lumineux à Marcory',
            'Charmant studio meublé au Plateau',
            'Bel appartement familial à Yopougon',
            'Résidence moderne avec balcon à Cocody',
            'Appartement confortable proche commerces',
            'Studio cosy idéal jeune actif',
            'Appartement calme dans quartier résidentiel',
            'Appartement spacieux proche transport',
            'Logement moderne avec belle vue',
            'Appartement rénové à Treichville',
            'Studio pratique en centre-ville',
            'Appartement lumineux à Marcory Résidentiel',
            'Charmant appartement dans résidence sécurisée',
            'Appartement élégant proche écoles',
            'Studio moderne avec climatisation',
            'Appartement confortable à Cocody Riviera',
            'Bel appartement rénové au Plateau',
            'Appartement agréable et lumineux',
            'Studio pratique et bien situé'
        ]
    )[floor(random()*20)+1] || ' #' || gs,
    'Appartement confortable situé dans un quartier calme avec accès facile aux commodités.',
    'apartment',
    'available',
    'Abidjan',
    CASE
        WHEN gs % 5 = 0 THEN 'Cocody'
        WHEN gs % 5 = 1 THEN 'Yopougon'
        WHEN gs % 5 = 2 THEN 'Marcory'
        WHEN gs % 5 = 3 THEN 'Treichville'
        ELSE 'Plateau'
    END,
    25 + (random()*80)::int,
    1 + (random()*4)::int,
    1 + (random()*3)::int,
    1 + (random()*2)::int,
    100 + floor(random()*51),
    NOW()
FROM generate_series(1,50) gs;