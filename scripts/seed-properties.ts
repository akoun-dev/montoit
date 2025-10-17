import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://yvbgvlqxwvvqcvqwgvqw.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2Ymd2bHF4d3Z2cWN2cXdndnF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5MTQ4NTIsImV4cCI6MjA1ODQ5MDg1Mn0.XYZ';

const supabase = createClient(supabaseUrl, supabaseKey);

// Biens de test pour Abidjan
const properties = [
  {
    title: 'Villa Moderne 4 Chambres - Cocody',
    description: 'Magnifique villa moderne avec 4 chambres, salon spacieux, cuisine équipée, jardin et piscine. Située dans un quartier calme et sécurisé de Cocody.',
    price: 450000,
    type: 'villa',
    bedrooms: 4,
    bathrooms: 3,
    surface: 250,
    address: 'Cocody, Riviera Golf',
    city: 'Abidjan',
    latitude: 5.3599517,
    longitude: -3.9810128,
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
    ],
    amenities: ['piscine', 'jardin', 'parking', 'securite', 'climatisation'],
    available: true,
    certified_ansut: true,
  },
  {
    title: 'Appartement 3 Pièces - Plateau',
    description: 'Bel appartement de 3 pièces au cœur du Plateau, proche de tous commerces et transports. Vue imprenable sur la ville.',
    price: 250000,
    type: 'appartement',
    bedrooms: 2,
    bathrooms: 1,
    surface: 85,
    address: 'Plateau, Avenue Franchet d\'Esperey',
    city: 'Abidjan',
    latitude: 5.3266155,
    longitude: -4.0083155,
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    ],
    amenities: ['parking', 'climatisation', 'ascenseur'],
    available: true,
    certified_ansut: true,
  },
  {
    title: 'Studio Meublé - Marcory',
    description: 'Studio moderne entièrement meublé et équipé, idéal pour jeune professionnel. Proche de la zone 4.',
    price: 120000,
    type: 'studio',
    bedrooms: 1,
    bathrooms: 1,
    surface: 35,
    address: 'Marcory, Zone 4',
    city: 'Abidjan',
    latitude: 5.2892436,
    longitude: -3.9810128,
    images: [
      'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800',
    ],
    amenities: ['meuble', 'climatisation'],
    available: true,
    certified_ansut: false,
  },
  {
    title: 'Duplex 5 Chambres - Yopougon',
    description: 'Grand duplex de 5 chambres avec terrasse, parfait pour famille nombreuse. Quartier résidentiel calme.',
    price: 350000,
    type: 'duplex',
    bedrooms: 5,
    bathrooms: 3,
    surface: 180,
    address: 'Yopougon, Niangon Nord',
    city: 'Abidjan',
    latitude: 5.3364449,
    longitude: -4.0890556,
    images: [
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
    ],
    amenities: ['jardin', 'parking', 'securite'],
    available: true,
    certified_ansut: true,
  },
  {
    title: 'Appartement Standing - Cocody',
    description: 'Appartement haut standing avec finitions luxueuses, dans résidence sécurisée avec piscine commune.',
    price: 380000,
    type: 'appartement',
    bedrooms: 3,
    bathrooms: 2,
    surface: 120,
    address: 'Cocody, Angré 8ème Tranche',
    city: 'Abidjan',
    latitude: 5.3964912,
    longitude: -3.9810128,
    images: [
      'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800',
      'https://images.unsplash.com/photo-1600566753151-384129cf4e3e?w=800',
    ],
    amenities: ['piscine', 'parking', 'securite', 'climatisation', 'ascenseur'],
    available: true,
    certified_ansut: true,
  },
  {
    title: 'Maison 3 Chambres - Abobo',
    description: 'Maison familiale avec 3 chambres, salon, cuisine, cour. Quartier populaire et animé.',
    price: 180000,
    type: 'maison',
    bedrooms: 3,
    bathrooms: 2,
    surface: 100,
    address: 'Abobo, Avocatier',
    city: 'Abidjan',
    latitude: 5.4167,
    longitude: -4.0167,
    images: [
      'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800',
    ],
    amenities: ['jardin', 'parking'],
    available: true,
    certified_ansut: false,
  },
  {
    title: 'Villa de Luxe - Cocody',
    description: 'Villa de prestige avec 6 chambres, piscine, jardin paysager, garage 3 voitures. Sécurité 24/7.',
    price: 850000,
    type: 'villa',
    bedrooms: 6,
    bathrooms: 5,
    surface: 400,
    address: 'Cocody, Riviera Palmeraie',
    city: 'Abidjan',
    latitude: 5.3599517,
    longitude: -3.9610128,
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
    ],
    amenities: ['piscine', 'jardin', 'parking', 'securite', 'climatisation', 'meuble'],
    available: true,
    certified_ansut: true,
  },
  {
    title: 'Appartement 2 Pièces - Treichville',
    description: 'Appartement lumineux de 2 pièces, proche du marché et des transports. Idéal premier achat.',
    price: 150000,
    type: 'appartement',
    bedrooms: 1,
    bathrooms: 1,
    surface: 55,
    address: 'Treichville, Boulevard de Marseille',
    city: 'Abidjan',
    latitude: 5.2892436,
    longitude: -4.0083155,
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    ],
    amenities: ['climatisation'],
    available: true,
    certified_ansut: false,
  },
];

async function seedProperties() {
  console.log('🌱 Début du seed des propriétés...');

  try {
    // Supprimer les anciennes données (optionnel)
    console.log('🗑️  Suppression des anciennes données...');
    const { error: deleteError } = await supabase
      .from('properties')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError && deleteError.code !== 'PGRST116') {
      console.warn('⚠️  Erreur lors de la suppression:', deleteError.message);
    }

    // Insérer les nouvelles propriétés
    console.log(`📝 Insertion de ${properties.length} propriétés...`);
    
    for (const property of properties) {
      const { data, error } = await supabase
        .from('properties')
        .insert([property])
        .select();

      if (error) {
        console.error(`❌ Erreur lors de l'insertion de "${property.title}":`, error.message);
      } else {
        console.log(`✅ "${property.title}" ajoutée avec succès`);
      }
    }

    console.log('🎉 Seed terminé avec succès !');
    
    // Vérifier le nombre de propriétés
    const { count, error: countError } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Erreur lors du comptage:', countError.message);
    } else {
      console.log(`📊 Total de propriétés dans la base: ${count}`);
    }

  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  }
}

// Exécuter le seed
seedProperties();

