import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const uuid = () => crypto.randomUUID()

const PROPS_OWNER = 'b165e0c9-3604-4547-a792-0442c3d3d4b8'
const AGENCY_OWNER = 'bb9bd2e2-928b-4d55-a3f1-dacb595e279b'

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
] as const

const VIDEO_URL = 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4'

const TYPES = ['APPARTEMENT', 'MAISON', 'STUDIO', 'VILLA', 'DUPLEX'] as const
const STATUSES = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED'] as const

const NON_ABIDJAN_CITIES = [
  'Yamoussoukro', 'Bouaké', 'Daloa', 'San-Pédro', 'Korhogo', 'Man', 'Gagnoa', 'Divo',
  'Soubré', 'Abengourou', 'Aboisso', 'Adzopé', 'Agboville', 'Bondoukou', 'Bouaflé',
  'Boundiali', 'Bouna', 'Daoukro', 'Dabou', 'Danané', 'Dimbokro', 'Duékoué',
  'Ferkessédougou', 'Grand-Bassam', 'Guiglo', 'Issia', 'Katiola', 'Lakota', 'Mankono',
  'Méagui', 'Odienné', 'Oumé', 'Sassandra', 'Séguéla', 'Sinfra', 'Tabou', 'Tanda',
  'Touba', 'Toumodi', 'Vavoua', 'Zuénoula',
]

const TITLES_BY_TYPE: Record<string, string[]> = {
  APPARTEMENT: ['Appartement F3 Centre Ville', 'Appartement F2 Quartier Résidentiel', 'Appartement F4 Vue Dégagée', 'Appartement Meublé F3', 'Appartement F1 Économique'],
  MAISON: ['Maison 3 Chambres Cour Intérieure', 'Maison 4 Chambres Jardin', 'Maison Moderne 2 Chambres', 'Maison Familiale 5 Chambres', 'Maison Plain-pied 3 Chambres'],
  STUDIO: ['Studio Meublé Centre', 'Studio Équipé Proche Marché', 'Studio Confort Lumineux', 'Studio Tout Confort', 'Studio Pas Cher'],
  VILLA: ['Villa 4 Chambres Piscine', 'Villa Standing 5 Chambres', 'Villa 3 Chambres Jardin', 'Villa Haut Standing 6 Chambres', 'Villa Moderne 4 Chambres'],
  DUPLEX: ['Duplex Moderne 3 Pièces', 'Duplex Standing 4 Pièces', 'Duplex Familial 5 Pièces', 'Duplex Vue 3 Pièces', 'Duplex Récent 4 Pièces'],
}

const DESCRIPTIONS_BY_TYPE: Record<string, string[]> = {
  APPARTEMENT: ['Bel appartement lumineux en plein centre-ville, à proximité de toutes les commodités.', 'Appartement spacieux dans un quartier calme et résidentiel, idéal pour une famille.', 'Appartement avec une belle vue dégagée, bien situé et bien entretenu.', 'Appartement meublé de standing, prêt à habiter avec cuisine équipée.', 'Appartement économique et fonctionnel, parfait pour un étudiant ou un jeune actif.'],
  MAISON: ['Maison avec cour intérieure, idéale pour une famille, bien aérée et lumineuse.', 'Maison 4 chambres avec un beau jardin, quartier résidentiel calme.', 'Maison moderne récemment construite, finitions de qualité, prête à habiter.', 'Grande maison familiale avec toutes les commodités, proche des écoles et commerces.', 'Maison plain-pied avec 3 chambres, adaptée aux personnes à mobilité réduite.'],
  STUDIO: ['Studio meublé situé en centre-ville, proche des transports en commun et commerces.', 'Studio équipé d une kitchenette et d une salle de douche moderne.', 'Studio lumineux avec balcon, bonne exposition, calme et sécurisé.', 'Studio tout confort avec climatisation et internet fibre optique.', 'Studio abordable et fonctionnel, idéal pour une personne seule.'],
  VILLA: ['Magnifique villa 4 chambres avec piscine et grand jardin arboré.', 'Villa de standing avec 5 chambres, piscine, et garage pour 2 voitures.', 'Villa 3 chambres avec jardin paysager et terrasse couverte.', 'Villa haut standing 6 chambres avec piscine, jacuzzi et salle de sport.', 'Villa moderne 4 chambres avec piscine et vue imprenable sur la ville.'],
  DUPLEX: ['Duplex moderne 3 pièces avec terrasse et belle hauteur sous plafond.', 'Duplex de standing 4 pièces avec toit-terrasse et vue panoramique.', 'Duplex familial 5 pièces avec jardin privatif et garage.', 'Duplex avec vue magnifique, 3 pièces lumineux et bien agencé.', 'Duplex récent 4 pièces dans une résidence sécurisée avec parking.'],
}

const STREETS = [
  'Rue des Cocotiers', 'Avenue de la République', 'Boulevard Principal', 'Rue du Commerce',
  'Avenue des Palmiers', 'Rue de l Indépendance', 'Boulevard de la Paix', 'Rue des Ambassades',
  'Avenue Houphouët-Boigny', 'Rue du Marché', 'Quartier Résidentiel', 'Zone Industrielle',
  'Lotissement Les Hibiscus', 'Quartier Plateau', 'Secteur Gare', 'Quartier Administratif',
  'Rue des Écoles', 'Avenue Charles de Gaulle', 'Boulevard du Port', 'Rue Principale',
]

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickN<T>(arr: readonly T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

const amenitiesOptions = [
  ['climatisation', 'eau courante', 'électricité'],
  ['climatisation', 'eau courante', 'électricité', 'internet fibre'],
  ['climatisation', 'eau courante', 'électricité', 'parking'],
  ['eau courante', 'électricité'],
  ['climatisation', 'eau courante', 'électricité', 'internet fibre', 'parking', 'jardin'],
]

async function main() {
  console.log('🚀 SEED VILLES — 5 propriétés par ville hors Abidjan\n')

  let created = 0
  let skipped = 0

  for (const city of NON_ABIDJAN_CITIES) {
    for (let i = 0; i < 5; i++) {
      const type = pick(TYPES)
      const titleIdx = i % 5
      const title = `${TITLES_BY_TYPE[type][titleIdx]} ${city}`
      const owner = Math.random() < 0.8 ? PROPS_OWNER : AGENCY_OWNER
      const images = pickN(IMAGES, 2 + Math.floor(Math.random() * 3))

      const existing = await supabase.from('properties').select('id').eq('title', title).maybeSingle()
      if (existing.data) {
        skipped++
        continue
      }

      const price = 100 + Math.floor(Math.random() * 201)

      const area = type === 'STUDIO' ? 20 + Math.floor(Math.random() * 20)
        : type === 'APPARTEMENT' ? 50 + Math.floor(Math.random() * 80)
        : type === 'MAISON' ? 100 + Math.floor(Math.random() * 150)
        : type === 'DUPLEX' ? 120 + Math.floor(Math.random() * 130)
        : 200 + Math.floor(Math.random() * 200)

      const bedrooms = type === 'STUDIO' ? null
        : type === 'APPARTEMENT' ? 1 + Math.floor(Math.random() * 3)
        : type === 'MAISON' ? 2 + Math.floor(Math.random() * 3)
        : type === 'DUPLEX' ? 2 + Math.floor(Math.random() * 2)
        : 3 + Math.floor(Math.random() * 3)

      const bathrooms = type === 'STUDIO' ? 1
        : 1 + Math.floor(Math.random() * 3)

      const status = pick(STATUSES)

      const id = uuid()
      const { error } = await supabase.from('properties').insert({
        id,
        title,
        description: pick(DESCRIPTIONS_BY_TYPE[type]),
        type,
        status,
        price,
        currency: 'FCFA',
        area,
        bedrooms,
        bathrooms,
        address: `${pick(STREETS)}, ${city}`,
        city,
        commune: null,
        latitude: null,
        longitude: null,
        is_furnished: Math.random() > 0.5,
        is_verified: status === 'ACTIVE',
        has_parking: Math.random() > 0.4,
        has_garden: Math.random() > 0.6,
        has_pool: Math.random() > 0.85,
        has_guardian: Math.random() > 0.7,
        has_climate: Math.random() > 0.3,
        amenities: JSON.stringify(pick(amenitiesOptions)),
        rental_terms: JSON.stringify({ deposit: '1 mois', notice: '3 mois', payment_method: 'virement bancaire' }),
        hide_owner_name: Math.random() > 0.8,
        virtual_tour_url: VIDEO_URL,
        views_count: Math.floor(Math.random() * 200),
        owner_id: owner,
        rental_status: 'disponible',
      })

      if (error) {
        console.error(`  ✗ ${title}: ${error.message}`)
        continue
      }

      for (let j = 0; j < images.length; j++) {
        await supabase.from('property_images').insert({
          id: uuid(), url: images[j], order: j, property_id: id,
        })
      }

      created++
    }
    console.log(`  ✓ ${city}: 5 propriétés`)
  }

  console.log(`\n✅ Terminé : ${created} créées, ${skipped} déjà existantes`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Erreur fatale:', err.message)
    process.exit(1)
  })
