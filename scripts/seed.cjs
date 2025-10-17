const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Charger les variables d'environnement
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const properties = [
  {
    title: 'Villa Moderne Cocody',
    description: 'Magnifique villa 4 chambres avec piscine et jardin dans le quartier résidentiel de Cocody',
    type: 'villa',
    price: 450000,
    bedrooms: 4,
    bathrooms: 3,
    surface: 250,
    location: 'Cocody',
    city: 'Abidjan',
    latitude: 5.3599517,
    longitude: -3.9810128,
    images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9'],
    amenities: ['piscine', 'parking', 'sécurité', 'jardin', 'climatisation'],
    status: 'disponible',
    owner_id: '00000000-0000-0000-0000-000000000001'
  },
  {
    title: 'Appartement Standing Plateau',
    description: 'Appartement 3 chambres au cœur du Plateau, proche de tous les commerces',
    type: 'appartement',
    price: 280000,
    bedrooms: 3,
    bathrooms: 2,
    surface: 120,
    location: 'Plateau',
    city: 'Abidjan',
    latitude: 5.3167,
    longitude: -4.0167,
    images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267'],
    amenities: ['parking', 'sécurité', 'climatisation', 'meublé'],
    status: 'disponible',
    owner_id: '00000000-0000-0000-0000-000000000001'
  },
  {
    title: 'Studio Meublé Marcory',
    description: 'Studio tout équipé à Marcory, idéal pour jeune professionnel',
    type: 'studio',
    price: 120000,
    bedrooms: 1,
    bathrooms: 1,
    surface: 35,
    location: 'Marcory',
    city: 'Abidjan',
    latitude: 5.2833,
    longitude: -3.9833,
    images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688'],
    amenities: ['climatisation', 'meublé'],
    status: 'disponible',
    owner_id: '00000000-0000-0000-0000-000000000001'
  },
  {
    title: 'Duplex Luxe Riviera',
    description: 'Duplex 5 chambres avec vue panoramique sur la lagune',
    type: 'duplex',
    price: 650000,
    bedrooms: 5,
    bathrooms: 4,
    surface: 300,
    location: 'Riviera',
    city: 'Abidjan',
    latitude: 5.3667,
    longitude: -3.9500,
    images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750'],
    amenities: ['piscine', 'parking', 'sécurité', 'jardin', 'climatisation', 'meublé'],
    status: 'disponible',
    owner_id: '00000000-0000-0000-0000-000000000001'
  },
  {
    title: 'Maison Familiale Yopougon',
    description: 'Grande maison 4 chambres avec cour spacieuse',
    type: 'maison',
    price: 180000,
    bedrooms: 4,
    bathrooms: 2,
    surface: 180,
    location: 'Yopougon',
    city: 'Abidjan',
    latitude: 5.3333,
    longitude: -4.0833,
    images: ['https://images.unsplash.com/photo-1568605114967-8130f3a36994'],
    amenities: ['parking', 'jardin'],
    status: 'disponible',
    owner_id: '00000000-0000-0000-0000-000000000001'
  },
  {
    title: 'Appartement Neuf Angré',
    description: 'Appartement 2 chambres dans résidence sécurisée avec piscine',
    type: 'appartement',
    price: 320000,
    bedrooms: 2,
    bathrooms: 2,
    surface: 90,
    location: 'Angré',
    city: 'Abidjan',
    latitude: 5.3833,
    longitude: -3.9667,
    images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2'],
    amenities: ['piscine', 'parking', 'sécurité', 'climatisation'],
    status: 'disponible',
    owner_id: '00000000-0000-0000-0000-000000000001'
  },
  {
    title: 'Villa avec Piscine Bingerville',
    description: 'Villa 4 chambres avec grande piscine et jardin tropical',
    type: 'villa',
    price: 420000,
    bedrooms: 4,
    bathrooms: 3,
    surface: 220,
    location: 'Bingerville',
    city: 'Abidjan',
    latitude: 5.3500,
    longitude: -3.9000,
    images: ['https://images.unsplash.com/photo-1613490493576-7fde63acd811'],
    amenities: ['piscine', 'parking', 'sécurité', 'jardin', 'climatisation'],
    status: 'disponible',
    owner_id: '00000000-0000-0000-0000-000000000001'
  },
  {
    title: 'Penthouse Deux Plateaux',
    description: 'Penthouse de luxe 3 chambres avec terrasse panoramique',
    type: 'appartement',
    price: 580000,
    bedrooms: 3,
    bathrooms: 3,
    surface: 160,
    location: 'Deux Plateaux',
    city: 'Abidjan',
    latitude: 5.3667,
    longitude: -4.0000,
    images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00'],
    amenities: ['parking', 'sécurité', 'climatisation', 'meublé'],
    status: 'disponible',
    owner_id: '00000000-0000-0000-0000-000000000001'
  }
];

async function seed() {
  console.log('🌱 Début du seed Supabase...');
  
  try {
    // Insérer les propriétés
    const { data, error } = await supabase
      .from('properties')
      .insert(properties)
      .select();

    if (error) {
      console.error('❌ Erreur lors du seed:', error);
      process.exit(1);
    }

    console.log(`✅ ${data?.length || 0} biens insérés avec succès !`);
    console.log('🎉 Seed terminé !');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur fatale:', err);
    process.exit(1);
  }
}

seed();

