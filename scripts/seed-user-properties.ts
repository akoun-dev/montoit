import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local')
  console.error('Usage: node --env-file=.env.local --experimental-transform-types scripts/seed-user-properties.ts')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const uuid = () => crypto.randomUUID()

const IMAGES = [
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800',
  'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800',
  'https://images.unsplash.com/photo-1560185127-6ed1894735f8?w=800',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
  'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800',
  'https://images.unsplash.com/photo-1600566753086-00f18aab7ed0?w=800',
  'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800',
  'https://images.unsplash.com/photo-1600566753376-12c8ab7c4e5e?w=800',
]

interface PropertyInput {
  title: string
  description: string
  type: string
  price: number
  area: number
  bedrooms: number | null
  bathrooms: number
  address: string
  city: string
  commune: string
  latitude: number
  longitude: number
  is_furnished: boolean
  has_parking: boolean
  has_garden: boolean
  has_pool: boolean
  images: string[]
}

const PROPERTIES: PropertyInput[] = [
  // ─── Appartements ───
  {
    title: 'Appartement F3 Deux Plateaux',
    description: 'Bel appartement F3 aux Deux Plateaux. Salon spacieux, cuisine équipée, proche des commerces et écoles.',
    type: 'APPARTEMENT', price: 120, area: 80, bedrooms: 2, bathrooms: 1,
    address: 'Deux Plateaux, Cocody', city: 'Abidjan', commune: 'Cocody',
    latitude: 5.3750, longitude: -3.9650,
    is_furnished: true, has_parking: true, has_garden: false, has_pool: false,
    images: [IMAGES[3], IMAGES[4]],
  },
  {
    title: 'Appartement F4 Angré Château',
    description: 'Appartement F4 moderne à Angré Château. Vue dégagée, grande terrasse, climatisation réversible.',
    type: 'APPARTEMENT', price: 180, area: 110, bedrooms: 3, bathrooms: 2,
    address: 'Angré Château, Cocody', city: 'Abidjan', commune: 'Cocody',
    latitude: 5.3860, longitude: -3.9520,
    is_furnished: true, has_parking: true, has_garden: false, has_pool: false,
    images: [IMAGES[5], IMAGES[6], IMAGES[7]],
  },
  {
    title: 'Appartement F1 Riviera Bonoumin',
    description: 'Studio F1 à la Riviera Bonoumin. Calme, sécurisé, idéal pour étudiant ou jeune actif.',
    type: 'STUDIO', price: 60, area: 35, bedrooms: null, bathrooms: 1,
    address: 'Riviera Bonoumin, Cocody', city: 'Abidjan', commune: 'Cocody',
    latitude: 5.3600, longitude: -3.9700,
    is_furnished: true, has_parking: false, has_garden: false, has_pool: false,
    images: [IMAGES[7]],
  },
  {
    title: 'Appartement F3 Williamsville',
    description: 'Appartement F3 à Williamsville. Bon état, proche du CHU de Treichville et des transports.',
    type: 'APPARTEMENT', price: 80, area: 65, bedrooms: 2, bathrooms: 1,
    address: 'Williamsville, Treichville', city: 'Abidjan', commune: 'Treichville',
    latitude: 5.2930, longitude: -3.9820,
    is_furnished: false, has_parking: false, has_garden: false, has_pool: false,
    images: [IMAGES[8]],
  },

  // ─── Studios ───
  {
    title: 'Studio Cocody Danga',
    description: 'Studio meublé à Cocody Danga. Quartier résidentiel calme, proche de l\'université.',
    type: 'STUDIO', price: 80, area: 30, bedrooms: null, bathrooms: 1,
    address: 'Danga, Cocody', city: 'Abidjan', commune: 'Cocody',
    latitude: 5.3700, longitude: -3.9450,
    is_furnished: true, has_parking: false, has_garden: false, has_pool: false,
    images: [IMAGES[9]],
  },
  {
    title: 'Studio Économique Abobo PK18',
    description: 'Petit studio économique à Abobo PK18. Proche du grand marché et des gares routières.',
    type: 'STUDIO', price: 40, area: 20, bedrooms: null, bathrooms: 1,
    address: 'PK18, Abobo', city: 'Abidjan', commune: 'Abobo',
    latitude: 5.4300, longitude: -4.0400,
    is_furnished: false, has_parking: false, has_garden: false, has_pool: false,
    images: [IMAGES[10]],
  },

  // ─── Villas ───
  {
    title: 'Villa 6 Chambres Riviera Palmeraie',
    description: 'Magnifique villa 6 chambres à la Riviera Palmeraie. Grande piscine, jardin paysager, dépendance. Quartier très sécurisé.',
    type: 'VILLA', price: 400, area: 450, bedrooms: 6, bathrooms: 4,
    address: 'Riviera Palmeraie, Cocody', city: 'Abidjan', commune: 'Cocody',
    latitude: 5.3650, longitude: -3.9800,
    is_furnished: true, has_parking: true, has_garden: true, has_pool: true,
    images: [IMAGES[0], IMAGES[1], IMAGES[2], IMAGES[10]],
  },
  {
    title: 'Villa 3 Chambres Grand-Bassam',
    description: 'Belle villa 3 chambres à Grand-Bassam. À 200m de la plage, idéale pour vacances ou résidence secondaire.',
    type: 'VILLA', price: 150, area: 180, bedrooms: 3, bathrooms: 2,
    address: 'Quartier France, Grand-Bassam', city: 'Grand-Bassam', commune: 'Grand-Bassam',
    latitude: 5.1980, longitude: -3.7350,
    is_furnished: true, has_parking: true, has_garden: true, has_pool: false,
    images: [IMAGES[11], IMAGES[12]],
  },
  {
    title: 'Villa Moderne Bingerville',
    description: 'Villa moderne 4 chambres à Bingerville. Grand terrain 2000m², jardin avec arbres fruitiers.',
    type: 'VILLA', price: 250, area: 280, bedrooms: 4, bathrooms: 3,
    address: 'Lot 127, Bingerville', city: 'Abidjan', commune: 'Cocody',
    latitude: 5.3500, longitude: -3.8900,
    is_furnished: false, has_parking: true, has_garden: true, has_pool: true,
    images: [IMAGES[13], IMAGES[14], IMAGES[0]],
  },

  // ─── Maisons ───
  {
    title: 'Maison 2 Chambres Anyama',
    description: 'Maison 2 chambres à Anyama. Cour intérieure, accès facile, calme. Idéal pour petit famille.',
    type: 'MAISON', price: 70, area: 100, bedrooms: 2, bathrooms: 1,
    address: 'Anyama Centre', city: 'Abidjan', commune: 'Anyama',
    latitude: 5.4800, longitude: -4.0500,
    is_furnished: false, has_parking: true, has_garden: true, has_pool: false,
    images: [IMAGES[5], IMAGES[6]],
  },
  {
    title: 'Maison de Plain-Pied Adjamé',
    description: 'Maison de plain-pied à Adjamé. Proche du grand marché. Accès facile en transport.',
    type: 'MAISON', price: 90, area: 110, bedrooms: 2, bathrooms: 1,
    address: 'Adjamé Village', city: 'Abidjan', commune: 'Adjamé',
    latitude: 5.3200, longitude: -4.0100,
    is_furnished: false, has_parking: false, has_garden: false, has_pool: false,
    images: [IMAGES[8]],
  },

  // ─── Duplex / Penthouse ───
  {
    title: 'Duplex Moderne Marcory',
    description: 'Superbe duplex moderne à Marcory. Salon double hauteur, 3 chambres, rooftop avec vue sur la lagune.',
    type: 'DUPLEX', price: 250, area: 180, bedrooms: 3, bathrooms: 2,
    address: 'Marcory Résidentiel', city: 'Abidjan', commune: 'Marcory',
    latitude: 5.3000, longitude: -3.9880,
    is_furnished: true, has_parking: true, has_garden: false, has_pool: false,
    images: [IMAGES[3], IMAGES[4], IMAGES[5]],
  },
  {
    title: 'Penthouse Vue Mer Assinie',
    description: 'Penthouse exceptionnel à Assinie. Vue panoramique sur l\'océan. Terrasse 100m². Accès plage privée.',
    type: 'PENTHOUSE', price: 350, area: 200, bedrooms: 3, bathrooms: 2,
    address: 'Assinie Mafia', city: 'Assinie', commune: 'Assinie',
    latitude: 5.1320, longitude: -3.2280,
    is_furnished: true, has_parking: true, has_garden: false, has_pool: true,
    images: [IMAGES[11], IMAGES[12], IMAGES[13]],
  },

  // ─── Biens économiques supplémentaires ───
  {
    title: 'Chambre Meublée Yopougon Niangon',
    description: 'Chambre meublée dans villa à Yopougon Niangon. Accès cuisine et salon partagés. Idéal étudiant.',
    type: 'STUDIO', price: 35, area: 18, bedrooms: null, bathrooms: 1,
    address: 'Niangon, Yopougon', city: 'Abidjan', commune: 'Yopougon',
    latitude: 5.3380, longitude: -4.0900,
    is_furnished: true, has_parking: false, has_garden: false, has_pool: false,
    images: [IMAGES[14]],
  },
  {
    title: 'Appartement F2 Koumassi',
    description: 'Appartement F2 à Koumassi. Récemment rénové, cuisine américaine, proche du port.',
    type: 'APPARTEMENT', price: 55, area: 45, bedrooms: 1, bathrooms: 1,
    address: 'Koumassi Port', city: 'Abidjan', commune: 'Koumassi',
    latitude: 5.2850, longitude: -3.9550,
    is_furnished: false, has_parking: false, has_garden: false, has_pool: false,
    images: [IMAGES[9], IMAGES[10]],
  },
  {
    title: 'Maison 4 Chambres Songon',
    description: 'Grande maison 4 chambres à Songon. Terrain 500m², jardin, parking. Calme et verdoyant.',
    type: 'MAISON', price: 130, area: 160, bedrooms: 4, bathrooms: 2,
    address: 'Songon Kassemblé', city: 'Abidjan', commune: 'Songon',
    latitude: 5.3100, longitude: -4.1700,
    is_furnished: false, has_parking: true, has_garden: true, has_pool: false,
    images: [IMAGES[1], IMAGES[2]],
  },
  {
    title: 'Appartement F3 Plateau Kennedy',
    description: 'Appartement F3 au Plateau Kennedy. Quartier des affaires, proche de toutes les administrations.',
    type: 'APPARTEMENT', price: 200, area: 95, bedrooms: 2, bathrooms: 1,
    address: 'Boulevard Kennedy, Plateau', city: 'Abidjan', commune: 'Plateau',
    latitude: 5.3190, longitude: -4.0180,
    is_furnished: true, has_parking: true, has_garden: false, has_pool: false,
    images: [IMAGES[4], IMAGES[5]],
  },
  {
    title: 'Villa 5 Chambres Adiapo-Doumé',
    description: 'Villa 5 chambres à Adiapo-Doumé. Grande piscine, terrain de 1500m², dépendance pour gardien.',
    type: 'VILLA', price: 300, area: 350, bedrooms: 5, bathrooms: 3,
    address: 'Adiapo-Doumé, Route d\'Alépé', city: 'Abidjan', commune: 'Cocody',
    latitude: 5.3350, longitude: -3.8650,
    is_furnished: true, has_parking: true, has_garden: true, has_pool: true,
    images: [IMAGES[0], IMAGES[12], IMAGES[14]],
  },
  {
    title: 'Terrain + Villa Début Construction',
    description: 'Villa en début de construction sur grand terrain. Possibilité de reprendre les plans. Idéal investissement.',
    type: 'MAISON', price: 100, area: 250, bedrooms: 3, bathrooms: 1,
    address: 'Lokoa, Bingerville', city: 'Abidjan', commune: 'Cocody',
    latitude: 5.3420, longitude: -3.9050,
    is_furnished: false, has_parking: true, has_garden: true, has_pool: false,
    images: [IMAGES[6], IMAGES[7]],
  },
]

const TARGET_EMAIL = process.argv[2] || 'aboa.akoun40@gmail.com'

async function seed() {
  // Look up the user by email
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('id, email, first_name, last_name')
    .eq('email', TARGET_EMAIL)
    .single()

  if (userErr || !user) {
    console.error(`❌ Utilisateur avec l'email "${TARGET_EMAIL}" introuvable.`)
    console.error(`   Erreur: ${userErr?.message || 'Utilisateur non trouvé'}`)
    process.exit(1)
  }

  const TARGET_USER_ID = user.id

  console.log(`✅ Utilisateur trouvé: ${user.first_name} ${user.last_name} (${user.email})`)
  console.log(`   ID: ${user.id}`)

  let created = 0
  let existing = 0

  for (const p of PROPERTIES) {
    const { images, ...data } = p
    const propertyId = uuid()

    // Check if a similar property already exists for this user (same title)
    const { data: existingProp } = await supabase
      .from('properties')
      .select('id')
      .eq('title', p.title)
      .eq('owner_id', TARGET_USER_ID)
      .maybeSingle()

    if (existingProp) {
      console.log(`  ∼ Existe déjà: ${p.title}`)
      existing++
      continue
    }

    const { error: propErr } = await supabase.from('properties').insert({
      id: propertyId,
      ...data,
      status: 'PENDING_VERIFICATION',
      is_verified: false,
      currency: 'FCFA',
      owner_id: TARGET_USER_ID,
      amenities: JSON.stringify(['climatisation', 'eau courante', 'électricité']),
      rental_terms: JSON.stringify({
        deposit: '1 mois',
        notice: '3 mois',
        payment_method: 'virement bancaire',
      }),
    })
    if (propErr) {
      console.error(`  ✗ ${p.title} → ${propErr.message}`)
      continue
    }

    // Insert images
    for (let i = 0; i < images.length; i++) {
      const { error: imgErr } = await supabase.from('property_images').insert({
        id: uuid(),
        url: images[i],
        order: i,
        property_id: propertyId,
      })
      if (imgErr) {
        console.error(`    ⚠ Image ${i} pour "${p.title}" → ${imgErr.message}`)
      }
    }

    console.log(`  ✓ PENDING_VERIFICATION  ${p.title} — ${p.price.toLocaleString()} FCFA`)
    created++
  }

  console.log(`\n✅ ${created} propriétés non vérifiées créées pour ${user.first_name} ${user.last_name}`)
  if (existing > 0) {
    console.log(`   ${existing} propriétés existaient déjà (ignorées)`)
  }
}

seed()
  .then(() => {
    console.log('Terminé.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('\n❌ Erreur:', err.message)
    process.exit(1)
  })
