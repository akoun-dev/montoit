-- Exemple de données pour les images panoramiques 360°
-- Ce script montre comment stocker les données panoramiques dans la table properties

-- Format des données panoramiques dans la colonne panoramic_images (JSONB)
-- Structure: Array<{ url: string; title?: string }>

-- Exemple 1: Bien avec 3 panoramas
UPDATE properties 
SET panoramic_images = '[
  {
    "url": "https://storage.example.com/panoramas/property-123/salon-360.jpg",
    "title": "Salon"
  },
  {
    "url": "https://storage.example.com/panoramas/property-123/chambre-360.jpg",
    "title": "Chambre principale"
  },
  {
    "url": "https://storage.example.com/panoramas/property-123/cuisine-360.jpg",
    "title": "Cuisine équipée"
  }
]'::jsonb
WHERE id = 'your-property-id';

-- Exemple 2: Bien avec 1 seul panorama
UPDATE properties 
SET panoramic_images = '[
  {
    "url": "https://storage.example.com/panoramas/property-456/living-room-360.jpg",
    "title": "Espace de vie"
  }
]'::jsonb
WHERE id = 'another-property-id';

-- Exemple 3: Vérifier les propriétés avec des panoramas
SELECT 
  id,
  title,
  jsonb_array_length(panoramic_images) as nb_panoramas,
  panoramic_images
FROM properties
WHERE panoramic_images IS NOT NULL 
  AND jsonb_array_length(panoramic_images) > 0;

-- Exemple 4: Ajouter un panorama à une propriété existante
UPDATE properties
SET panoramic_images = COALESCE(panoramic_images, '[]'::jsonb) || 
  '[{
    "url": "https://storage.example.com/panoramas/new-panorama.jpg",
    "title": "Terrasse"
  }]'::jsonb
WHERE id = 'property-id';

-- Exemple 5: Supprimer tous les panoramas
UPDATE properties
SET panoramic_images = NULL
WHERE id = 'property-id';

-- Exemple 6: URLs d'exemples pour tester (images 360° publiques)
/*
Images 360° de test gratuites :
- https://photo-sphere-viewer.js.org/examples/sphere.jpg
- https://cdn.pannellum.org/2.5/images/alma.jpg
- https://threejs.org/examples/textures/2294472375_24a3b8ef46_o.jpg

Pour des images réelles, utilisez :
- Ricoh Theta samples : https://theta360.com/
- Google Street View images
- Vos propres captures avec un smartphone
*/

-- Exemple avec image de test
UPDATE properties 
SET panoramic_images = '[
  {
    "url": "https://photo-sphere-viewer.js.org/examples/sphere.jpg",
    "title": "Exemple Salon 360°"
  }
]'::jsonb
WHERE id = 'test-property-id';
