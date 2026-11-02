/**
 * seed-complete.ts — Jeu de données de test complet
 *
 * Scénarios créés pour les comptes test :
 *   locataire@montoit.ci  (Moussa Koné)
 *   proprietaire@montoit.ci (Kouadio Yao)
 *   agence@montoit.ci     (Immobilier Cocody)
 *
 * ✅ Propriétés (actives, en attente, louées, rejetées)
 * ✅ Dossiers locatifs (validés, rejetés, brouillon)
 * ✅ Candidatures (acceptées, rejetées, en attente)
 * ✅ Baux (actifs, signature en attente, terminés)
 * ✅ Messages / conversations
 * ✅ Favoris
 * ✅ Visites (acceptées, refusées, contre-proposition, en attente)
 * ✅ Avis/ratings
 * ✅ Paiements (payés, en retard, à venir)
 * ✅ Demandes de maintenance (en attente, en cours, résolues)
 * ✅ Litiges (ouvert, résolu)
 * ✅ Agence — agents + mandats (actif, en attente, terminé)
 * ✅ Notifications
 *
 * Réexécutable sans risque (ignore les doublons).
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local')
  console.error('   Usage: node --env-file=.env.local --experimental-transform-types scripts/seed-complete.ts')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const uuid = () => crypto.randomUUID()
const now = new Date()
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString()
const daysFromNow = (n: number) => new Date(now.getTime() + n * 86400000).toISOString()

// ─── IDs des comptes test (créés par create-test-users.ts) ────────────────

const TEST_ACCOUNTS = {
  locataire: { id: '34593702-cc1f-4abb-8eef-0cd25246bf14', email: 'locataire@montoit.ci', name: 'Moussa Koné' },
  proprietaire: { id: 'e454be73-0866-46f6-8b51-449f51307b50', email: 'proprietaire@montoit.ci', name: 'Kouadio Yao' },
  agence: { id: 'fbb4991e-abd1-4370-8cdd-7597468b76ec', email: 'agence@montoit.ci', name: 'Immobilier Cocody' },
  tc: { id: '3802c374-ed76-4f64-9e8d-1c980e0a74b3', email: 'tc@montoit.ci', name: 'Aya Diabaté' },
  admin: { id: 'f86b24bf-07ed-4034-b8ea-1e3816d3982b', email: 'admin@montoit.ci', name: 'Admin Toit' },
} as const

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

// ─── Helpers ───────────────────────────────────────────────────────────────

const created: Record<string, number> = { properties: 0, images: 0, rentalFiles: 0, applications: 0, leases: 0, convs: 0, messages: 0, favorites: 0, visits: 0, ratings: 0, payments: 0, maintenance: 0, disputes: 0, agents: 0, agentProps: 0, mandats: 0, notifications: 0 }
const skipped: Record<string, number> = { properties: 0, rentalFiles: 0, applications: 0, leases: 0, convs: 0, messages: 0, favorites: 0, visits: 0, ratings: 0, payments: 0, maintenance: 0, disputes: 0, agents: 0, mandats: 0, notifications: 0 }

async function findPropertyByTitle(title: string) {
  const { data } = await supabase.from('properties').select('id, status, owner_id').eq('title', title).maybeSingle()
  return data
}

async function findLeaseByPropertyTenant(propertyId: string, tenantId: string) {
  const { data } = await supabase.from('leases').select('id, status').eq('property_id', propertyId).eq('tenant_id', tenantId).maybeSingle()
  return data
}

async function findRentalFileByTenant(tenantId: string, status: string) {
  const { data } = await supabase.from('rental_files').select('id, status').eq('tenant_id', tenantId).eq('status', status).maybeSingle()
  return data
}

async function findConversation(p1: string, p2: string) {
  const { data } = await supabase
    .from('conversations')
    .select('id')
    .or(`and(participant1_id.eq.${p1},participant2_id.eq.${p2}),and(participant1_id.eq.${p2},participant2_id.eq.${p1})`)
    .maybeSingle()
  return data
}

// ─── 1. PROPRIÉTÉS ────────────────────────────────────────────────────────

interface PropDef {
  title: string
  description: string
  type: string
  price: number
  area: number
  bedrooms: number | null
  bathrooms: number
  address: string
  commune: string
  is_furnished: boolean
  has_parking: boolean
  has_garden: boolean
  has_pool: boolean
  images: readonly string[]
  status: string
  owner_id: string
}

const PROPERTY_DEFS: PropDef[] = [
  // ── Propriétaire : Actives ──
  { title: 'Villa 5 Chambres Cocody Angré', description: 'Magnifique villa 5 chambres avec piscine à Angré.', type: 'VILLA', price: 300, area: 350, bedrooms: 5, bathrooms: 4, address: 'Angré 7e Tranche', commune: 'Cocody', is_furnished: true, has_parking: true, has_garden: true, has_pool: true, images: [IMAGES[0], IMAGES[1], IMAGES[2]], status: 'ACTIVE', owner_id: TEST_ACCOUNTS.proprietaire.id },
  { title: 'Appartement F4 Plateau', description: 'Bel appartement F4 au cœur du Plateau.', type: 'APPARTEMENT', price: 250, area: 130, bedrooms: 3, bathrooms: 2, address: 'Boulevard de la République', commune: 'Plateau', is_furnished: true, has_parking: true, has_garden: false, has_pool: false, images: [IMAGES[3], IMAGES[4]], status: 'ACTIVE', owner_id: TEST_ACCOUNTS.proprietaire.id },
  { title: 'Duplex Standing Marcory Zone 4', description: 'Superbe duplex 4 pièces dans le quartier huppé de Marcory.', type: 'DUPLEX', price: 300, area: 200, bedrooms: 3, bathrooms: 2, address: 'Zone 4, Marcory', commune: 'Marcory', is_furnished: true, has_parking: true, has_garden: false, has_pool: true, images: [IMAGES[5], IMAGES[6]], status: 'ACTIVE', owner_id: TEST_ACCOUNTS.proprietaire.id },
  { title: 'Studio Meublé Yopougon', description: 'Studio fonctionnel et meublé à Yopougon.', type: 'STUDIO', price: 100, area: 28, bedrooms: null, bathrooms: 1, address: 'Sogefiha, Yopougon', commune: 'Yopougon', is_furnished: true, has_parking: false, has_garden: false, has_pool: false, images: [IMAGES[7]], status: 'ACTIVE', owner_id: TEST_ACCOUNTS.proprietaire.id },
  // ── Propriétaire : En attente de vérification ──
  { title: 'Appartement F2 Abobo', description: 'Appartement F2 à Abobo, quartier populaire.', type: 'APPARTEMENT', price: 50, area: 50, bedrooms: 1, bathrooms: 1, address: 'Abobo Baoulé', commune: 'Abobo', is_furnished: false, has_parking: false, has_garden: false, has_pool: false, images: [IMAGES[8]], status: 'PENDING_VERIFICATION', owner_id: TEST_ACCOUNTS.proprietaire.id },
  { title: 'Villa 4 Chambres Koumassi', description: 'Villa 4 chambres à Koumassi, grand salon.', type: 'VILLA', price: 150, area: 200, bedrooms: 4, bathrooms: 2, address: 'Koumassi Campement', commune: 'Koumassi', is_furnished: false, has_parking: true, has_garden: true, has_pool: false, images: [IMAGES[9], IMAGES[10]], status: 'PENDING_VERIFICATION', owner_id: TEST_ACCOUNTS.proprietaire.id },
  // ── Propriétaire : Loué (via bail actif) ──
  { title: 'Penthouse Luxe Riviera Golf', description: 'Penthouse d\'exception à la Riviera Golf.', type: 'PENTHOUSE', price: 300, area: 250, bedrooms: 4, bathrooms: 3, address: 'Riviera Golf, Cocody', commune: 'Cocody', is_furnished: true, has_parking: true, has_garden: false, has_pool: true, images: [IMAGES[10], IMAGES[11], IMAGES[12]], status: 'RENTED', owner_id: TEST_ACCOUNTS.proprietaire.id },
  // ── Agence : propriétés directes (gérées par l'agence) ──
  { title: 'Appartement F3 Agence Cocody', description: 'Bel appartement F3 géré par Immobilier Cocody.', type: 'APPARTEMENT', price: 180, area: 90, bedrooms: 2, bathrooms: 1, address: 'Cocody Danga', commune: 'Cocody', is_furnished: true, has_parking: true, has_garden: false, has_pool: false, images: [IMAGES[3], IMAGES[4], IMAGES[5]], status: 'ACTIVE', owner_id: TEST_ACCOUNTS.agence.id },
  { title: 'Villa Agence Riviera 3', description: 'Villa 4 chambres gérée par Immobilier Cocody.', type: 'VILLA', price: 250, area: 280, bedrooms: 4, bathrooms: 2, address: 'Riviera 3, Cocody', commune: 'Cocody', is_furnished: true, has_parking: true, has_garden: true, has_pool: true, images: [IMAGES[0], IMAGES[12], IMAGES[14]], status: 'ACTIVE', owner_id: TEST_ACCOUNTS.agence.id },
]

async function seedProperties() {
  console.log('\n📦 PROPRIÉTÉS')
  const propIds: Record<string, string> = {}

  for (const p of PROPERTY_DEFS) {
    const existing = await findPropertyByTitle(p.title)
    if (existing) {
      propIds[p.title] = existing.id
      console.log(`  ∼ Existe déjà: ${p.title} (${existing.status})`)
      skipped.properties++
      continue
    }

    const id = uuid()
    const { images: _img, ...propData } = p
    const { error } = await supabase.from('properties').insert({
      id, ...propData, city: 'Abidjan', currency: 'FCFA', latitude: 5.35, longitude: -3.96,
      amenities: JSON.stringify(['climatisation', 'eau courante', 'électricité']),
      rental_terms: JSON.stringify({ deposit: '1 mois', notice: '3 mois', payment_method: 'virement bancaire' }),
      is_verified: p.status === 'ACTIVE' || p.status === 'RENTED',
      rental_status: p.status === 'RENTED' ? 'loue' : 'disponible',
    })

    if (error) { console.error(`  ✗ ${p.title}: ${error.message}`); continue }

    propIds[p.title] = id
    created.properties++

    for (let i = 0; i < p.images.length; i++) {
      await supabase.from('property_images').insert({ id: uuid(), url: p.images[i], order: i, property_id: id })
      created.images++
    }

    console.log(`  ✓ ${p.status}  ${p.title}`)
  }

  return propIds
}

// ─── 2. DOSSIERS LOCATIFS ─────────────────────────────────────────────────

async function seedRentalFiles() {
  console.log('\n📋 DOSSIERS LOCATIFS')

  const types = [
    { status: 'VALIDATED', tc_comment: 'Dossier complet, toutes les pièces sont conformes.', monthly_income: 500000, employer: 'Orange CI', employment_type: 'CDI' },
    { status: 'REJECTED', tc_comment: 'Revenus insuffisants par rapport au loyer.', monthly_income: 150000, employer: 'Petit commerçant', employment_type: 'OTHER' },
    { status: 'DRAFT', tc_comment: null, monthly_income: null, employer: null, employment_type: null },
  ]

  const ids: string[] = []

  for (const t of types) {
    const existing = await findRentalFileByTenant(TEST_ACCOUNTS.locataire.id, t.status)
    if (existing) { skipped.rentalFiles++; console.log(`  ∼ Existe déjà: ${t.status}`); ids.push(existing.id); continue }

    const id = uuid()
    const { error } = await supabase.from('rental_files').insert({
      id, tenant_id: TEST_ACCOUNTS.locataire.id, status: t.status, priority: 'NORMAL',
      reviewed_by_id: TEST_ACCOUNTS.tc.id, reviewed_at: daysAgo(15),
      monthly_income: t.monthly_income, employer: t.employer, employment_type: t.employment_type,
      tenant_category: 'SALARIE', guarantor_name: 'Koffi Koné', guarantor_phone: '+22501020304', guarantor_relation: 'Père',
      tc_comment: t.tc_comment,
    })

    if (error) { console.error(`  ✗ ${t.status}: ${error.message}`); continue }
    created.rentalFiles++
    ids.push(id)
    console.log(`  ✓ ${t.status}`)
  }

  return ids
}

// ─── 3. CANDIDATURES (applications) ──────────────────────────────────────

async function seedApplications(propertyIds: Record<string, string>, rentalFileIds: string[]) {
  console.log('\n📄 CANDIDATURES')

  const validatedRentalFileId = rentalFileIds[0] // VALIDATED
  const rejectedRentalFileId = rentalFileIds[1]  // REJECTED

  const apps = [
    { rental_file_id: validatedRentalFileId, property_id: propertyIds['Penthouse Luxe Riviera Golf'], status: 'VALIDATED', motivation: 'Je suis très intéressé par ce bien exceptionnel.' },
    { rental_file_id: validatedRentalFileId, property_id: propertyIds['Villa 5 Chambres Cocody Angré'], status: 'VALIDATED', motivation: 'Villa parfaite pour ma famille.' },
    { rental_file_id: rejectedRentalFileId, property_id: propertyIds['Appartement F4 Plateau'], status: 'REJECTED', motivation: 'Bel appartement bien situé.' },
    { rental_file_id: validatedRentalFileId, property_id: propertyIds['Duplex Standing Marcory Zone 4'], status: 'SUBMITTED', motivation: 'Duplex idéal pour mon activité professionnelle.' },
  ]

  for (const a of apps) {
    const { data: existing } = await supabase.from('applications').select('id').eq('tenant_id', TEST_ACCOUNTS.locataire.id).eq('property_id', a.property_id).maybeSingle()
    if (existing) { skipped.applications++; continue }

    const { error } = await supabase.from('applications').insert({
      id: uuid(), tenant_id: TEST_ACCOUNTS.locataire.id, rental_file_id: a.rental_file_id,
      property_id: a.property_id, status: a.status, motivation: a.motivation,
      monthly_income: a.status === 'VALIDATED' ? 500000 : 150000, employment_type: 'CDI',
    })

    if (error) { console.error(`  ✗ ${a.property_id}: ${error.message}`); continue }
    created.applications++
    console.log(`  ✓ ${a.status} → ${Object.entries(propertyIds).find(([, v]) => v === a.property_id)?.[0] ?? a.property_id}`)
  }
}

// ─── 4. BAUX (leases) ────────────────────────────────────────────────────

async function seedLeases(propertyIds: Record<string, string>, rentalFileIds: string[]) {
  console.log('\n📜 BAUX')

  const leases = [
    {
      label: 'Actif (signé)',
      propertyId: propertyIds['Penthouse Luxe Riviera Golf'],
      status: 'ACTIVE', start: daysAgo(180), end: daysFromNow(185),
      monthly_rent: 300, charges: 15, deposit: 300,
      tenantSigned: daysAgo(175), ownerSigned: daysAgo(176),
      rentalFileId: rentalFileIds[0],
    },
    {
      label: 'Signature en attente',
      propertyId: propertyIds['Villa 5 Chambres Cocody Angré'],
      status: 'PENDING_SIGNATURE', start: daysFromNow(15), end: daysFromNow(380),
      monthly_rent: 300, charges: 20, deposit: 300,
      tenantSigned: daysAgo(2), ownerSigned: null,
      rentalFileId: rentalFileIds[0],
    },
    {
      label: 'Terminé',
      propertyId: propertyIds['Duplex Standing Marcory Zone 4'],
      status: 'TERMINATED', start: daysAgo(400), end: daysAgo(30),
      monthly_rent: 300, charges: 15, deposit: 300,
      tenantSigned: daysAgo(395), ownerSigned: daysAgo(396),
      rentalFileId: rentalFileIds[0],
    },
  ]

  const leaseIds: string[] = []

  for (const l of leases) {
    const existing = await findLeaseByPropertyTenant(l.propertyId, TEST_ACCOUNTS.locataire.id)
    if (existing) { skipped.leases++; leaseIds.push(existing.id); console.log(`  ∼ Existe déjà: ${l.label}`); continue }

    const id = uuid()
    const { error } = await supabase.from('leases').insert({
      id, status: l.status, start_date: l.start, end_date: l.end,
      monthly_rent: l.monthly_rent, charges: l.charges, deposit: l.deposit,
      special_conditions: l.label === 'Actif (signé)' ? 'Loyer payable avant le 5 de chaque mois.' : null,
      owner_signed_at: l.ownerSigned, tenant_signed_at: l.tenantSigned,
      property_id: l.propertyId, tenant_id: TEST_ACCOUNTS.locataire.id,
      owner_id: TEST_ACCOUNTS.proprietaire.id, rental_file_id: l.rentalFileId,
    })

    if (error) { console.error(`  ✗ ${l.label}: ${error.message}`); continue }
    created.leases++
    leaseIds.push(id)
    console.log(`  ✓ ${l.label} (${l.status})`)
  }

  return leaseIds
}

// ─── 5. CONVERSATIONS & MESSAGES ─────────────────────────────────────────

async function seedMessages(propertyIds: Record<string, string>) {
  console.log('\n💬 MESSAGES')

  const convDefs = [
    {
      p1: TEST_ACCOUNTS.locataire.id, p2: TEST_ACCOUNTS.proprietaire.id,
      propertyId: propertyIds['Penthouse Luxe Riviera Golf'],
      messages: [
        { sender: TEST_ACCOUNTS.locataire.id, content: 'Bonjour, je suis intéressé par le Penthouse. Est-il toujours disponible ?', days: -60 },
        { sender: TEST_ACCOUNTS.proprietaire.id, content: 'Bonjour Moussa, oui il est toujours disponible. Souhaitez-vous organiser une visite ?', days: -59, read: true },
        { sender: TEST_ACCOUNTS.locataire.id, content: 'Oui volontiers ! Je suis disponible ce week-end.', days: -58, read: true },
        { sender: TEST_ACCOUNTS.proprietaire.id, content: 'Parfait. Samedi à 10h, cela vous convient ?', days: -57, read: true },
        { sender: TEST_ACCOUNTS.locataire.id, content: 'C\'est noté. Merci beaucoup !', days: -56, read: true },
        { sender: TEST_ACCOUNTS.locataire.id, content: 'Bonjour, la climatisation du salon fait un bruit étrange depuis hier. Pouvez-vous envoyer quelqu\'un ?', days: -5 },
      ],
    },
    {
      p1: TEST_ACCOUNTS.locataire.id, p2: TEST_ACCOUNTS.agence.id,
      propertyId: propertyIds['Appartement F3 Agence Cocody'],
      messages: [
        { sender: TEST_ACCOUNTS.locataire.id, content: 'Bonjour, je souhaiterais visiter l\'appartement F3 à Cocody Danga.', days: -30 },
        { sender: TEST_ACCOUNTS.agence.id, content: 'Bonjour Moussa, nous pouvons organiser une visite cette semaine. Quel jour préférez-vous ?', days: -29, read: true },
      ],
    },
  ]

  for (const cd of convDefs) {
    const existing = await findConversation(cd.p1, cd.p2)
    const convId = existing?.id ?? uuid()

    if (!existing) {
      const { error } = await supabase.from('conversations').insert({
        id: convId, participant1_id: cd.p1, participant2_id: cd.p2, property_id: cd.propertyId, last_message_at: daysAgo(cd.messages[cd.messages.length - 1].days),
      })
      if (error) { console.error(`  ✗ Conversation ${cd.p1.slice(0, 8)}…⇔${cd.p2.slice(0, 8)}…: ${error.message}`); continue }
      created.convs++
    } else {
      skipped.convs++
    }

    // Insert messages
    for (const m of cd.messages) {
      const { data: existingMsg } = await supabase.from('messages').select('id').eq('conversation_id', convId).eq('content', m.content).maybeSingle()
      if (existingMsg) { skipped.messages++; continue }

      const { error } = await supabase.from('messages').insert({
        id: uuid(), conversation_id: convId, sender_id: m.sender,
        content: m.content, is_read: m.read ?? false, created_at: daysAgo(m.days),
      })
      if (!error) created.messages++
      else console.error(`  ✗ Message: ${error.message}`)
    }

    console.log(`  ✓ Conversation ${cd.p2 === TEST_ACCOUNTS.proprietaire.id ? 'Locataire ⇔ Propriétaire' : 'Locataire ⇔ Agence'}`)
  }
}

// ─── 6. FAVORIS ──────────────────────────────────────────────────────────

async function seedFavorites(propertyIds: Record<string, string>) {
  console.log('\n❤️ FAVORIS')

  const targetProps = [propertyIds['Penthouse Luxe Riviera Golf'], propertyIds['Villa 5 Chambres Cocody Angré'], propertyIds['Appartement F3 Agence Cocody']]

  for (const pid of targetProps) {
    const { data: existing } = await supabase.from('favorites').select('id').eq('user_id', TEST_ACCOUNTS.locataire.id).eq('property_id', pid).maybeSingle()
    if (existing) { skipped.favorites++; continue }

    const { error } = await supabase.from('favorites').insert({ id: uuid(), user_id: TEST_ACCOUNTS.locataire.id, property_id: pid })
    if (error) { console.error(`  ✗ Favori: ${error.message}`); continue }
    created.favorites++
  }

  console.log(`  ✓ ${created.favorites} favoris créés pour le locataire`)
}

// ─── 7. VISITES ──────────────────────────────────────────────────────────

async function seedVisits(propertyIds: Record<string, string>) {
  console.log('\n🏠 VISITES')

  const visits = [
    { status: 'ACCEPTED', prop: propertyIds['Penthouse Luxe Riviera Golf'], date: daysAgo(45), slot: '10:00-11:00', msg: 'Superbe visite, bien entretenu.' },
    { status: 'COMPLETED', prop: propertyIds['Villa 5 Chambres Cocody Angré'], date: daysAgo(30), slot: '14:00-15:00', msg: 'Visite effectuée, locataire satisfait.' },
    { status: 'REJECTED', prop: propertyIds['Duplex Standing Marcory Zone 4'], date: daysAgo(20), slot: '09:00-10:00', msg: null, ownerComment: 'Indisponible cette semaine, veuillez reprendre rendez-vous.' },
    { status: 'COUNTER_PROPOSED', prop: propertyIds['Appartement F4 Plateau'], date: daysAgo(15), slot: '16:00-17:00', msg: 'Je peux le samedi si possible.', counterDate: daysAgo(13), counterSlot: '10:00-11:00' },
    { status: 'PENDING', prop: propertyIds['Studio Meublé Yopougon'], date: daysFromNow(5), slot: '11:00-12:00', msg: 'Bonjour, je souhaite visiter ce studio.' },
  ]

  for (const v of visits) {
    const { data: existing } = await supabase.from('visit_requests').select('id').eq('property_id', v.prop).eq('tenant_id', TEST_ACCOUNTS.locataire.id).eq('status', v.status).maybeSingle()
    if (existing) { skipped.visits++; continue }

    const { error } = await supabase.from('visit_requests').insert({
      id: uuid(), property_id: v.prop, tenant_id: TEST_ACCOUNTS.locataire.id,
      visit_type: 'PHYSICAL', requested_date: v.date, time_slot: v.slot,
      status: v.status, tenant_message: v.msg, owner_comment: (v as any).ownerComment ?? null,
      counter_date: (v as any).counterDate ?? null, counter_time_slot: (v as any).counterSlot ?? null,
    })

    if (error) { console.error(`  ✗ Visite ${v.status}: ${error.message}`); continue }
    created.visits++
  }

  console.log(`  ✓ ${created.visits} visites créées`)
}

// ─── 8. AVIS / RATINGS ──────────────────────────────────────────────────

async function seedRatings(leaseIds: string[], propertyIds: Record<string, string>) {
  console.log('\n⭐ AVIS')

  const ratings = [
    { score: 4, comment: 'Excellent propriétaire, toujours réactif et à l\'écoute. Le bien est conforme à la description.', from: TEST_ACCOUNTS.locataire.id, to: TEST_ACCOUNTS.proprietaire.id, leaseIdx: 0 },
    { score: 5, comment: 'Locataire exemplaire, paie ses loyers à temps et prend soin du bien. Je recommande.', from: TEST_ACCOUNTS.proprietaire.id, to: TEST_ACCOUNTS.locataire.id, leaseIdx: 0 },
  ]

  for (const r of ratings) {
    const leaseId = leaseIds[r.leaseIdx]
    const leasePropMap: Record<string, string> = {}
    const { data: lease } = await supabase.from('leases').select('property_id').eq('id', leaseId).single()
    if (lease) leasePropMap[leaseId] = lease.property_id

    const { data: existing } = await supabase.from('ratings').select('id').eq('lease_id', leaseId).eq('from_user_id', r.from).eq('to_user_id', r.to).maybeSingle()
    if (existing) { skipped.ratings++; continue }

    const { error } = await supabase.from('ratings').insert({
      id: uuid(), score: r.score, comment: r.comment, lease_id: leaseId,
      property_id: leasePropMap[leaseId] ?? null, from_user_id: r.from, to_user_id: r.to,
    })

    if (error) { console.error(`  ✗ Avis: ${error.message}`); continue }
    created.ratings++
  }

  console.log(`  ✓ ${created.ratings} avis créés`)
}

// ─── 9. PAIEMENTS ──────────────────────────────────────────────────────

async function seedPayments(leaseIds: string[]) {
  console.log('\n💰 PAIEMENTS')

  const activeLeaseId = leaseIds[0]
  const pendingLeaseId = leaseIds[1]

  const payments = [
    { leaseId: activeLeaseId, amount: 315, due: daysAgo(150), paid: daysAgo(148), status: 'PAID', method: 'ORANGE_MONEY', ref: 'OM-2026-001' },
    { leaseId: activeLeaseId, amount: 315, due: daysAgo(120), paid: daysAgo(118), status: 'PAID', method: 'ORANGE_MONEY', ref: 'OM-2026-002' },
    { leaseId: activeLeaseId, amount: 315, due: daysAgo(90), paid: daysAgo(92), status: 'PAID', method: 'MTN_MOMO', ref: 'MOMO-2026-001' },
    { leaseId: activeLeaseId, amount: 315, due: daysAgo(30), paid: null, status: 'LATE', method: null, ref: null },
    { leaseId: pendingLeaseId, amount: 320, due: daysFromNow(20), paid: null, status: 'PENDING', method: null, ref: null },
  ]

  for (const p of payments) {
    const { data: existing } = await supabase.from('payments').select('id').eq('lease_id', p.leaseId).eq('due_date', p.due).maybeSingle()
    if (existing) { skipped.payments++; continue }

    const { error } = await supabase.from('payments').insert({
      id: uuid(), lease_id: p.leaseId, tenant_id: TEST_ACCOUNTS.locataire.id,
      amount: p.amount, status: p.status, due_date: p.due, paid_at: p.paid,
      method: p.method, reference: p.ref, operator_phone_number: '+22505050505',
    })

    if (error) { console.error(`  ✗ Paiement ${p.status}: ${error.message}`); continue }
    created.payments++
  }

  console.log(`  ✓ ${created.payments} paiements créés`)
}

// ─── 10. MAINTENANCE ────────────────────────────────────────────────────

async function seedMaintenance(leaseIds: string[]) {
  console.log('\n🔧 MAINTENANCE')

  const activeLeaseId = leaseIds[0]
  const requests = [
    { leaseId: activeLeaseId, title: 'Climatisation HS salon', desc: 'La climatisation du salon ne refroidit plus depuis 3 jours.', status: 'IN_PROGRESS', priority: 'HIGH', days: -10 },
    { leaseId: activeLeaseId, title: 'Raccordement eau chaude', desc: 'L\'eau chaude de la douche ne fonctionne plus.', status: 'PENDING', priority: 'URGENT', days: -2 },
    { leaseId: activeLeaseId, title: 'Changement ampoule extérieure', desc: 'L\'ampoule du porche est grillée.', status: 'RESOLVED', priority: 'LOW', days: -20, resolution: 'Ampoule remplacée le 15/03.' },
  ]

  for (const r of requests) {
    const { data: existing } = await supabase.from('maintenance_requests').select('id').eq('lease_id', r.leaseId).eq('title', r.title).maybeSingle()
    if (existing) { skipped.maintenance++; continue }

    const { error } = await supabase.from('maintenance_requests').insert({
      id: uuid(), lease_id: r.leaseId, tenant_id: TEST_ACCOUNTS.locataire.id,
      title: r.title, description: r.desc, status: r.status, priority: r.priority,
      created_at: daysAgo(Math.abs(r.days)), resolution: (r as any).resolution ?? null,
    })

    if (error) { console.error(`  ✗ Maintenance: ${error.message}`); continue }
    created.maintenance++
  }

  console.log(`  ✓ ${created.maintenance} demandes de maintenance créées`)
}

// ─── 11. LITIGES ────────────────────────────────────────────────────────

async function seedDisputes(leaseIds: string[]) {
  console.log('\n⚖️ LITIGES')

  const activeLeaseId = leaseIds[0]
  const terminatedLeaseId = leaseIds[2]

  const disputes = [
    { leaseId: activeLeaseId, type: 'PROPERTY_DAMAGE', desc: 'Le lave-vaisselle a fui et a endommagé le parquet de la cuisine.', status: 'OPEN', priority: 'HIGH', reportedBy: TEST_ACCOUNTS.locataire.id },
    { leaseId: terminatedLeaseId, type: 'OTHER', desc: 'Dépôt de garantie non restitué 2 mois après la sortie.', status: 'RESOLVED', priority: 'NORMAL', reportedBy: TEST_ACCOUNTS.locataire.id, resolvedBy: TEST_ACCOUNTS.tc.id, resolution: 'Dépôt de garantie restitué après médiation du Tiers de Confiance.' },
  ]

  for (const d of disputes) {
    const { data: existing } = await supabase.from('disputes').select('id').eq('lease_id', d.leaseId).eq('type', d.type).maybeSingle()
    if (existing) { skipped.disputes++; continue }

    const { error } = await supabase.from('disputes').insert({
      id: uuid(), lease_id: d.leaseId, type: d.type, description: d.desc,
      status: d.status, priority: d.priority as any,
      reported_by_id: d.reportedBy, resolved_by_id: (d as any).resolvedBy ?? null,
      resolution: (d as any).resolution ?? null,
      evidence_urls: '[]', investigation_notes: null,
    })

    if (error) { console.error(`  ✗ Litige: ${error.message}`); continue }
    created.disputes++
  }

  console.log(`  ✓ ${created.disputes} litiges créés`)
}

// ─── 12. AGENCE — AGENTS + MANDATS ─────────────────────────────────────

async function seedAgency(propertyIds: Record<string, string>) {
  console.log('\n🏢 AGENCE — AGENTS')

  const agentIds: string[] = []

  const agents = [
    { first_name: 'Fatou', last_name: 'Diallo', email: 'fatou@immococo.ci', phone: '+22507070707', role: 'ADMIN' as const },
    { first_name: 'Karim', last_name: 'Touré', email: 'karim@immococo.ci', phone: '+22508080808', role: 'AGENT' as const },
    { first_name: 'Mariam', last_name: 'Konaté', email: 'mariam@immococo.ci', phone: '+22509090909', role: 'AGENT' as const },
  ]

  for (const a of agents) {
    const { data: existing } = await supabase.from('agency_agents').select('id').eq('email', a.email).eq('agency_id', TEST_ACCOUNTS.agence.id).maybeSingle()
    if (existing) { skipped.agents++; agentIds.push(existing.id); continue }

    const id = uuid()
    const { error } = await supabase.from('agency_agents').insert({
      id, first_name: a.first_name, last_name: a.last_name, email: a.email, phone: a.phone, role: a.role,
      status: 'ACTIVE', agency_id: TEST_ACCOUNTS.agence.id,
    })

    if (error) { console.error(`  ✗ Agent ${a.first_name}: ${error.message}`); continue }
    created.agents++
    agentIds.push(id)
  }

  console.log(`  ✓ ${created.agents} agents d'agence créés`)

  // Assigner les agents aux propriétés de l'agence
  const agencyProps = [propertyIds['Appartement F3 Agence Cocody'], propertyIds['Villa Agence Riviera 3']]
  for (const pid of agencyProps) {
    for (const agentId of agentIds.slice(0, 2)) {
      const { data: existing } = await supabase.from('agency_agent_properties').select('id').eq('agent_id', agentId).eq('property_id', pid).maybeSingle()
      if (existing) { continue }
      const { error } = await supabase.from('agency_agent_properties').insert({ id: uuid(), agent_id: agentId, property_id: pid })
      if (error) { console.error(`  ✗ Assignation agent-propriété: ${error.message}`); continue }
      created.agentProps++
    }
  }

  console.log(`  ✓ ${created.agentProps} assignations agent↔propriété créées`)

  // ── Mandats ──
  console.log('  — Mandats')

  const mandats = [
    {
      label: 'Actif',
      propId: propertyIds['Appartement F3 Agence Cocody'],
      status: 'ACTIVE', type: 'GESTION_COMPLETE', commissionRate: 8,
      start: daysAgo(200), end: daysFromNow(165),
      ownerSigned: daysAgo(195), agencySigned: daysAgo(196),
    },
    {
      label: 'Signature en attente',
      propId: propertyIds['Villa Agence Riviera 3'],
      status: 'PENDING_SIGNATURE', type: 'GESTION_LOCATION', commissionRate: 5,
      start: daysFromNow(10), end: daysFromNow(375),
      ownerSigned: null, agencySigned: daysAgo(1),
    },
    {
      label: 'Terminé',
      propId: propertyIds['Villa 5 Chambres Cocody Angré'],
      status: 'TERMINATED', type: 'MANDAT_SIMPLE', commissionRate: 10,
      start: daysAgo(500), end: daysAgo(100),
      ownerSigned: daysAgo(495), agencySigned: daysAgo(496),
      terminatedAt: daysAgo(100), terminationReason: 'Fin de la période de gestion.',
    },
  ]

  for (const m of mandats) {
    const { data: existing } = await supabase.from('mandats').select('id').eq('property_id', m.propId).eq('status', m.status).eq('agency_id', TEST_ACCOUNTS.agence.id).maybeSingle()
    if (existing) { skipped.mandats++; continue }

    const { error } = await supabase.from('mandats').insert({
      id: uuid(), property_id: m.propId, owner_id: TEST_ACCOUNTS.proprietaire.id,
      agency_id: TEST_ACCOUNTS.agence.id, status: m.status, type: m.type,
      commission_rate: m.commissionRate, commission_type: 'PERCENTAGE',
      start_date: m.start, end_date: m.end,
      owner_signed_at: m.ownerSigned, agency_signed_at: m.agencySigned,
      conditions: 'Gestion locative complète incluant recherche de locataire, rédaction de bail et gestion des loyers.',
      terminated_at: (m as any).terminatedAt ?? null,
      termination_reason: (m as any).terminationReason ?? null,
    })

    if (error) { console.error(`  ✗ Mandat ${m.label}: ${error.message}`); continue }
    created.mandats++
  }

  console.log(`  ✓ ${created.mandats} mandats créés`)
}

// ─── 13. NOTIFICATIONS ───────────────────────────────────────────────────

async function seedNotifications() {
  console.log('\n🔔 NOTIFICATIONS')

  const notifs = [
    // Locataire
    { userId: TEST_ACCOUNTS.locataire.id, type: 'VISIT_REMINDER', title: 'Rappel de visite', message: 'Votre visite pour le Studio Meublé Yopougon est dans 2 jours.', days: -1 },
    { userId: TEST_ACCOUNTS.locataire.id, type: 'PAYMENT_ALERT', title: 'Paiement en retard', message: 'Votre loyer de 315 000 FCFA est en retard. Merci de régulariser.', days: -5 },
    { userId: TEST_ACCOUNTS.locataire.id, type: 'MESSAGE', title: 'Nouveau message', message: 'Vous avez reçu un message de Kouadio Yao.', days: -3 },
    { userId: TEST_ACCOUNTS.locataire.id, type: 'MAINTENANCE', title: 'Maintenance en cours', message: 'Votre demande pour la climatisation est en cours de traitement.', days: -7 },
    // Propriétaire
    { userId: TEST_ACCOUNTS.proprietaire.id, type: 'APPLICATION', title: 'Nouvelle candidature', message: 'Moussa Koné a candidaté pour votre Villa 5 Chambres.', days: -15 },
    { userId: TEST_ACCOUNTS.proprietaire.id, type: 'VISIT_REMINDER', title: 'Visite à confirmer', message: 'Une demande de visite pour le Studio Meublé Yopougon est en attente.', days: -3 },
    { userId: TEST_ACCOUNTS.proprietaire.id, type: 'DOSSIER_UPDATE', title: 'Dossier validé', message: 'Le dossier locatif de Moussa Koné a été validé par le TC.', days: -14 },
    { userId: TEST_ACCOUNTS.proprietaire.id, type: 'LEASE_UPDATE', title: 'Bail signé', message: 'Le bail pour le Penthouse Riviera Golf a été signé par les deux parties.', days: -170 },
    // Agence
    { userId: TEST_ACCOUNTS.agence.id, type: 'SYSTEM', title: 'Nouveau mandat', message: 'Un mandat de gestion vous a été attribué pour l\'Appartement F3 Cocody.', days: -190 },
    { userId: TEST_ACCOUNTS.agence.id, type: 'MESSAGE', title: 'Nouveau message', message: 'Moussa Koné vous a envoyé un message.', days: -28 },
    { userId: TEST_ACCOUNTS.agence.id, type: 'DOSSIER_UPDATE', title: 'Visite planifiée', message: 'Une visite a été planifiée pour votre propriété Cocody Danga.', days: -25 },
    // TC
    { userId: TEST_ACCOUNTS.tc.id, type: 'PROPERTY_VERIFICATION', title: 'Nouveau bien à vérifier', message: 'Le bien Appartement F2 Abobo est en attente de vérification.', days: -2 },
    { userId: TEST_ACCOUNTS.tc.id, type: 'DOSSIER_UPDATE', title: 'Dossier à traiter', message: 'Un dossier locatif est en attente de votre validation.', days: -5 },
  ]

  for (const n of notifs) {
    const { error } = await supabase.from('notifications').insert({
      id: uuid(), user_id: n.userId, type: n.type, title: n.title, message: n.message,
      is_read: Math.random() > 0.4, created_at: daysAgo(n.days),
    })
    if (error) { console.error(`  ✗ Notification: ${error.message}`); continue }
    created.notifications++
  }

  for (const uid of [TEST_ACCOUNTS.admin.id]) {
    const { error } = await supabase.from('notifications').insert({
      id: uuid(), user_id: uid, type: 'SYSTEM', title: 'Nouveaux inscrits',
      message: '3 nouveaux utilisateurs se sont inscrits cette semaine.', is_read: false,
    })
    if (!error) created.notifications++
  }

  console.log(`  ✓ ${created.notifications} notifications créées`)
}

// ─── MAIN ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 SEED COMPLET — Génération des données de test\n')
  console.log('Comptes :')
  console.log(`   Locataire  : ${TEST_ACCOUNTS.locataire.name} (${TEST_ACCOUNTS.locataire.email})`)
  console.log(`   Propriétaire : ${TEST_ACCOUNTS.proprietaire.name} (${TEST_ACCOUNTS.proprietaire.email})`)
  console.log(`   Agence     : ${TEST_ACCOUNTS.agence.name} (${TEST_ACCOUNTS.agence.email})`)
  console.log(`   TC         : ${TEST_ACCOUNTS.tc.name} (${TEST_ACCOUNTS.tc.email})`)

  const propertyIds = await seedProperties()
  const rentalFileIds = await seedRentalFiles()
  await seedApplications(propertyIds, rentalFileIds)
  const leaseIds = await seedLeases(propertyIds, rentalFileIds)
  await seedMessages(propertyIds)
  await seedFavorites(propertyIds)
  await seedVisits(propertyIds)
  await seedRatings(leaseIds, propertyIds)
  await seedPayments(leaseIds)
  await seedMaintenance(leaseIds)
  await seedDisputes(leaseIds)
  await seedAgency(propertyIds)
  await seedNotifications()

  // ── Récapitulatif ──
  console.log('\n══════════════════════════════════════════')
  console.log('📊 RÉCAPITULATIF')
  console.log('══════════════════════════════════════════')
  for (const key of Object.keys(created)) {
    if (created[key] > 0 || (skipped as any)[key] > 0) {
      const c = created[key]
      const s = (skipped as any)[key]
      const label = key.charAt(0).toUpperCase() + key.slice(1)
      console.log(`   ${label.padEnd(14)} ${c} créé(s)${s > 0 ? ` (${s} déjà existant(s))` : ''}`)
    }
  }
  console.log('══════════════════════════════════════════')
  console.log('✅ Seed terminé !')
  console.log('Mot de passe pour tous les comptes : Test1234!')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Erreur fatale:', err.message)
    process.exit(1)
  })
