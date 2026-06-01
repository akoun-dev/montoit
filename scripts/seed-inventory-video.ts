import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const uuid = () => crypto.randomUUID()

const TC_ID = 'f20df688-acf0-4161-8c2c-2f12492414b0'
const VIDEO_URL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'

const DESIGNATIONS = [
  { name: 'SOL', order: 1 },
  { name: 'PEINTURE DES MURS', order: 2 },
  { name: 'PEINTURE DES PLAFONDS', order: 3 },
  { name: 'PORTES', order: 4 },
  { name: 'ELECTRICITE', order: 5 },
  { name: 'ROBINETTERIE', order: 6 },
  { name: 'EVIER INOX DE LAVABO', order: 7 },
  { name: 'DOUCHE ET SDB', order: 8 },
  { name: 'NOMBRE DE CLES', order: 9 },
]

async function seed() {
  const { data: properties } = await supabase
    .from('properties')
    .select('id, title, owner_id, virtual_tour_url')
    .eq('status', 'ACTIVE')

  if (!properties || properties.length === 0) {
    console.log('Aucune propriété ACTIVE trouvée.')
    process.exit(0)
  }

  console.log(`🏠 ${properties.length} propriétés ACTIVES trouvées\n`)

  let reportsCreated = 0
  let videosAdded = 0
  let reportSkips = 0
  let videoSkips = 0

  for (const prop of properties) {
    // ── État des lieux ──
    const { data: existing } = await supabase
      .from('inventory_reports')
      .select('id')
      .eq('property_id', prop.id)
      .limit(1)
      .maybeSingle()

    if (existing) {
      console.log(`  ∼ État des lieux existe déjà: ${prop.title}`)
      reportSkips++
    } else {
      const reportId = uuid()
      const { error: reportErr } = await supabase.from('inventory_reports').insert({
        id: reportId,
        property_id: prop.id,
        type: 'INVENTORY_ENTRANCE',
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        reviewer_id: TC_ID,
        general_observations: 'État des lieux d\'entrée — Tout est en bon état.',
        total_keys: 3,
      })

      if (reportErr) {
        console.error(`  ✗ ${prop.title} (rapport): ${reportErr.message}`)
        continue
      }

      const items = DESIGNATIONS.map((d) => {
        const isKeys = d.name === 'NOMBRE DE CLES'
        return {
          id: uuid(),
          report_id: reportId,
          designation: d.name,
          designation_order: d.order,
          kitchen: isKeys ? '2' : 'BON',
          main_bathroom: isKeys ? '2' : 'BON',
          other_bathroom: isKeys ? '1' : 'BON',
          other_room1: isKeys ? '1' : 'BON',
          other_room2: isKeys ? '1' : 'BON',
          observations: null,
        }
      })

      const { error: itemsErr } = await supabase.from('inventory_report_items').insert(items)

      if (itemsErr) {
        console.error(`  ✗ ${prop.title} (items): ${itemsErr.message}`)
        await supabase.from('inventory_reports').delete().eq('id', reportId)
        continue
      }

      reportsCreated++
      console.log(`  ✓ État des lieux: ${prop.title}`)
    }

    // ── Vidéo ──
    if (prop.virtual_tour_url) {
      console.log(`  ∼ Vidéo existe déjà: ${prop.title}`)
      videoSkips++
    } else {
      const { error: videoErr } = await supabase
        .from('properties')
        .update({ virtual_tour_url: VIDEO_URL })
        .eq('id', prop.id)

      if (videoErr) {
        console.error(`  ✗ ${prop.title} (vidéo): ${videoErr.message}`)
        continue
      }

      videosAdded++
      console.log(`  ✓ Vidéo ajoutée: ${prop.title}`)
    }
  }

  console.log(`\n═══════════════════════════════════════`)
  console.log(`📊 RÉCAPITULATIF`)
  console.log(`   États des lieux : ${reportsCreated} créés${reportSkips > 0 ? `, ${reportSkips} existants` : ''}`)
  console.log(`   Vidéos          : ${videosAdded} ajoutées${videoSkips > 0 ? `, ${videoSkips} existantes` : ''}`)
  console.log(`═══════════════════════════════════════`)
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Erreur:', err.message)
    process.exit(1)
  })
