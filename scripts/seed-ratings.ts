import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local')
  console.error('Usage: node --env-file=.env.local --experimental-transform-types scripts/seed-ratings.ts')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const uuid = () => crypto.randomUUID()

// ─── Existing data from the database ─────────────────────────────────────────

const TENANT_ID = '780acac6-9bef-43b8-9dc3-48dd14ab2327' // MERGUEZ GUNZAVELLI
const OWNER_ABOA = '91abf819-0ac9-4bb5-890c-22cf06dd34aa' // AKOUN BERNARD ABOA
const OWNER_YAO = 'e454be73-0866-46f6-8b51-449f51307b50' // Kouadio Yao

interface RatingInput {
  score: number
  comment: string
  leaseId: string
  propertyId: string
  fromUserId: string
  toUserId: string
}

const RATINGS: RatingInput[] = [
  // ─── Merguez (tenant) → AKOUN BERNARD (owner) ───
  {
    score: 4,
    comment: 'Très bon appartement, bien situé au Plateau. Propriétaire réactif et à l\'écoute. La climatisation fonctionne parfaitement.',
    leaseId: 'f9b378a1-5763-47f5-a8da-36e69523e01a',
    propertyId: 'bf861d47-465c-45a0-ba5a-694f026c05bf',
    fromUserId: TENANT_ID,
    toUserId: OWNER_ABOA,
  },
  {
    score: 5,
    comment: 'Exceptionnel ! Le penthouse à la Riviera Golf est magnifique, la vue est incroyable. Propriétaire très professionnel, tout était parfait du beginning à la fin.',
    leaseId: '6c374dbb-9360-4431-9f01-387d2fa996c4',
    propertyId: '06334511-2ecc-4438-b32e-f93e5aceddc5',
    fromUserId: TENANT_ID,
    toUserId: OWNER_ABOA,
  },
  {
    score: 4,
    comment: 'Duplex très agréable à Marcory, quartier calme et sécurisé. Quelques petits soucis de plomberie au début mais rapidement résolus par le propriétaire.',
    leaseId: '5c226231-cdb7-40c6-8c02-254af19cbf05',
    propertyId: '99d4ea7a-4385-4f29-ad77-c246622bd0bb',
    fromUserId: TENANT_ID,
    toUserId: OWNER_ABOA,
  },

  // ─── Merguez (tenant) → Kouadio Yao (owner) ───
  {
    score: 4,
    comment: 'Belle villa à Cocody Angré, bien entretenue et spacieuse. Propriétaire sérieux. Seul bémol : le quartier peut être bruyant le week-end.',
    leaseId: 'c0dc88a7-e793-4f2f-8ba0-35999013f304',
    propertyId: 'ffc930fc-5570-4645-8fa8-a30a146d0344',
    fromUserId: TENANT_ID,
    toUserId: OWNER_YAO,
  },

  // ─── Kouadio Yao (owner) → Merguez (tenant) ───
  {
    score: 5,
    comment: 'Excellent locataire, respectueux des lieux et ponctuel dans les paiements. Je recommande sans hésitation.',
    leaseId: 'c0dc88a7-e793-4f2f-8ba0-35999013f304',
    propertyId: 'ffc930fc-5570-4645-8fa8-a30a146d0344',
    fromUserId: OWNER_YAO,
    toUserId: TENANT_ID,
  },
]

async function seed() {
  console.log('📊 Seed: Avis et évaluations de test\n')

  // Check that all referenced users exist
  const userIds = [TENANT_ID, OWNER_ABOA, OWNER_YAO]
  const { data: users } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .in('id', userIds)

  if (!users || users.length !== userIds.length) {
    console.error('❌ Certains utilisateurs sont introuvables.')
    const foundIds = new Set(users?.map((u: any) => u.id) || [])
    for (const uid of userIds) {
      if (!foundIds.has(uid)) {
        console.error(`   ID manquant: ${uid}`)
      }
    }
    process.exit(1)
  }

  const userMap = new Map(users.map((u: any) => [u.id, `${u.first_name} ${u.last_name}`]))
  console.log('✅ Utilisateurs vérifiés:')
  for (const [id, name] of userMap) {
    console.log(`   ${name} (${id.slice(0, 8)}…)`)
  }

  // Check that all referenced leases exist
  const leaseIds = [...new Set(RATINGS.map((r) => r.leaseId))]
  const { data: leases } = await supabase
    .from('leases')
    .select('id')
    .in('id', leaseIds)

  if (!leases || leases.length !== leaseIds.length) {
    console.error('❌ Certains baux sont introuvables.')
    const foundLeaseIds = new Set(leases?.map((l: any) => l.id) || [])
    for (const lid of leaseIds) {
      if (!foundLeaseIds.has(lid)) {
        console.error(`   Bail manquant: ${lid}`)
      }
    }
    process.exit(1)
  }
  console.log(`✅ ${leases.length} baux vérifiés\n`)

  // Insert ratings
  let created = 0
  let skipped = 0

  for (const r of RATINGS) {
    // Check for duplicate (same lease + same from_user + same to_user)
    const { data: existing } = await supabase
      .from('ratings')
      .select('id')
      .eq('lease_id', r.leaseId)
      .eq('from_user_id', r.fromUserId)
      .eq('to_user_id', r.toUserId)
      .maybeSingle()

    if (existing) {
      console.log(`  ∼ Déjà existant: ${userMap.get(r.fromUserId)} → ${userMap.get(r.toUserId)} (score: ${r.score})`)
      skipped++
      continue
    }

    const { error: err } = await supabase.from('ratings').insert({
      id: uuid(),
      score: r.score,
      comment: r.comment,
      lease_id: r.leaseId,
      property_id: r.propertyId,
      from_user_id: r.fromUserId,
      to_user_id: r.toUserId,
    })

    if (err) {
      console.error(`  ✗ ${userMap.get(r.fromUserId)} → ${userMap.get(r.toUserId)}: ${err.message}`)
      continue
    }

    console.log(`  ✓ ${'★'.repeat(r.score)}${'☆'.repeat(5 - r.score)} ${userMap.get(r.fromUserId)} → ${userMap.get(r.toUserId)}`)
    created++
  }

  // Calculate stats
  const avgScore = RATINGS.reduce((sum, r) => sum + r.score, 0) / RATINGS.length
  const satisfactionRate = Math.round((avgScore / 5) * 100)

  console.log(`\n✅ ${created} avis créés${skipped > 0 ? ` (${skipped} déjà existants ignorés)` : ''}`)
  console.log(`📊 Score moyen: ${avgScore.toFixed(1)}/5`)
  console.log(`📊 Taux de satisfaction: ${satisfactionRate}%`)

  if (created === 0 && skipped > 0) {
    console.log('\nℹ Tous les avis existaient déjà. Aucune nouvelle insertion.')
  }
}

seed()
  .then(() => {
    console.log('\nTerminé.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('\n❌ Erreur:', err.message)
    process.exit(1)
  })
