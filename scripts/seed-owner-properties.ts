import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import * as path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local')
  console.error('Usage: node --env-file=.env.local --experimental-transform-types scripts/seed-owner-properties.ts')
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
  verified: boolean
}

const PROPERTIES: PropertyInput[] = [
  {
    title: 'Villa 5 Chambres Cocody Angré',
    description: 'Magnifique villa 5 chambres avec piscine et grand jardin à Angré. Quartier résidentiel calme et sécurisé. Finitions haut de gamme.',
    type: 'VILLA', price: 300, area: 350, bedrooms: 5, bathrooms: 4,
    address: 'Angré 7e Tranche, Cocody', city: 'Abidjan', commune: 'Cocody',
    latitude: 5.3820, longitude: -3.9570,
    is_furnished: true, has_parking: true, has_garden: true, has_pool: true,
    images: [IMAGES[0], IMAGES[1], IMAGES[2]],
    verified: true,
  },
  {
    title: 'Appartement F4 Plateau',
    description: 'Bel appartement F4 au cœur du Plateau. Vue imprenable sur la lagune. Idéal pour cadre supérieur.',
    type: 'APPARTEMENT', price: 250, area: 130, bedrooms: 3, bathrooms: 2,
    address: 'Boulevard de la République, Plateau', city: 'Abidjan', commune: 'Plateau',
    latitude: 5.3160, longitude: -4.0200,
    is_furnished: true, has_parking: true, has_garden: false, has_pool: false,
    images: [IMAGES[3], IMAGES[4]],
    verified: true,
  },
  {
    title: 'Duplex Standing Marcory Zone 4',
    description: 'Superbe duplex 4 pièces dans le quartier huppé de la Zone 4 à Marcory. Prestations luxueuses.',
    type: 'DUPLEX', price: 300, area: 200, bedrooms: 3, bathrooms: 2,
    address: 'Zone 4, Marcory', city: 'Abidjan', commune: 'Marcory',
    latitude: 5.2990, longitude: -3.9920,
    is_furnished: true, has_parking: true, has_garden: false, has_pool: true,
    images: [IMAGES[5], IMAGES[6]],
    verified: true,
  },
  {
    title: 'Studio Meublé Yopougon',
    description: 'Studio fonctionnel et meublé à Yopougon. Proche des commodités et des transports en commun. Idéal étudiant.',
    type: 'STUDIO', price: 100, area: 28, bedrooms: null, bathrooms: 1,
    address: 'Sogefiha, Yopougon', city: 'Abidjan', commune: 'Yopougon',
    latitude: 5.3310, longitude: -4.0800,
    is_furnished: true, has_parking: false, has_garden: false, has_pool: false,
    images: [IMAGES[7]],
    verified: true,
  },
  {
    title: 'Maison 3 Chambres Bingerville',
    description: 'Charmante maison de plain-pied à Bingerville. Grand terrain arboré, calme et verdoyant.',
    type: 'MAISON', price: 200, area: 150, bedrooms: 3, bathrooms: 2,
    address: 'Route de Bingerville, Bingerville', city: 'Abidjan', commune: 'Cocody',
    latitude: 5.3550, longitude: -3.8980,
    is_furnished: false, has_parking: true, has_garden: true, has_pool: false,
    images: [IMAGES[8], IMAGES[9]],
    verified: true,
  },
  {
    title: 'Penthouse Luxe Riviera Golf',
    description: 'Penthouse d\'exception à la Riviera Golf. Vue panoramique sur le golf et la lagune. Terrasse de 80m².',
    type: 'PENTHOUSE', price: 300, area: 250, bedrooms: 4, bathrooms: 3,
    address: 'Riviera Golf, Cocody', city: 'Abidjan', commune: 'Cocody',
    latitude: 5.3700, longitude: -3.9750,
    is_furnished: true, has_parking: true, has_garden: false, has_pool: true,
    images: [IMAGES[10], IMAGES[11], IMAGES[12]],
    verified: true,
  },
  // ─── Non vérifiées (PENDING_VERIFICATION) ───
  {
    title: 'Appartement F2 Abobo',
    description: 'Appartement F2 à louer à Abobo. Quartier populaire et animé. Proche du marché et des transports.',
    type: 'APPARTEMENT', price: 50, area: 50, bedrooms: 1, bathrooms: 1,
    address: 'Abobo Baoulé', city: 'Abidjan', commune: 'Abobo',
    latitude: 5.4160, longitude: -4.0350,
    is_furnished: false, has_parking: false, has_garden: false, has_pool: false,
    images: [IMAGES[13]],
    verified: false,
  },
  {
    title: 'Villa 4 Chambres Koumassi',
    description: 'Villa 4 chambres à Koumassi. Grand salon, cuisine équipée. Idéale pour famille nombreuse.',
    type: 'VILLA', price: 150, area: 200, bedrooms: 4, bathrooms: 2,
    address: 'Koumassi Campement', city: 'Abidjan', commune: 'Koumassi',
    latitude: 5.2880, longitude: -3.9500,
    is_furnished: false, has_parking: true, has_garden: true, has_pool: false,
    images: [IMAGES[14], IMAGES[0]],
    verified: false,
  },
  {
    title: 'Studio Économique Port-Bouët',
    description: 'Petit studio économique à Port-Bouët. Proche de l\'aéroport. Idéal pour travailleur mobile.',
    type: 'STUDIO', price: 50, area: 22, bedrooms: null, bathrooms: 1,
    address: 'Port-Bouët, Aéroport', city: 'Abidjan', commune: 'Port-Bouët',
    latitude: 5.2480, longitude: -3.9410,
    is_furnished: false, has_parking: false, has_garden: false, has_pool: false,
    images: [IMAGES[2]],
    verified: false,
  },
  {
    title: 'Maison de Ville Treichville',
    description: 'Maison de ville à Treichville. Proche du centre-ville et des commodités. Bon rapport qualité-prix.',
    type: 'MAISON', price: 100, area: 120, bedrooms: 3, bathrooms: 1,
    address: 'Treichville, Rue 12', city: 'Abidjan', commune: 'Treichville',
    latitude: 5.2970, longitude: -3.9750,
    is_furnished: false, has_parking: false, has_garden: false, has_pool: false,
    images: [IMAGES[5]],
    verified: false,
  },
]

async function seed() {
  const { data: owner } = await supabase.from('users').select('id').eq('email', 'proprietaire@montoit.ci').single()
  if (!owner) {
    console.error('Propriétaire introuvable. Exécute d\'abord le script create-test-users.ts')
    process.exit(1)
  }

  const { data: tc } = await supabase.from('users').select('id').eq('email', 'tc@montoit.ci').single()
  if (!tc) {
    console.error('TC introuvable. Exécute d\'abord le script create-test-users.ts')
    process.exit(1)
  }

  const ownerId = owner.id
  const tcId = tc.id
  const reviewedAt = new Date().toISOString()

  let created = 0
  let verified = 0
  let pending = 0

  for (const p of PROPERTIES) {
    const { images, verified: isVerified, ...data } = p
    const propertyId = uuid()

    const { error: propErr } = await supabase.from('properties').insert({
      id: propertyId,
      ...data,
      status: isVerified ? 'ACTIVE' : 'PENDING_VERIFICATION',
      is_verified: isVerified,
      currency: 'FCFA',
      owner_id: ownerId,
      amenities: '[]',
      rental_terms: '{}',
    })
    if (propErr) {
      console.error(`  ✗ ${p.title} → ${propErr.message}`)
      continue
    }

    for (let i = 0; i < images.length; i++) {
      await supabase.from('property_images').insert({
        id: uuid(),
        url: images[i],
        order: i,
        property_id: propertyId,
      })
    }

    const label = isVerified ? '✓ VERIFIÉE' : '… EN ATTENTE'
    console.log(`  ${label}  ${p.title} — ${p.price.toLocaleString()} FCFA`)
    created++
    if (isVerified) verified++
    else pending++
  }

  console.log(`\n✅ ${created} propriétés créées (${verified} vérifiées, ${pending} en attente)`)
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Erreur:', err.message)
    process.exit(1)
  })
