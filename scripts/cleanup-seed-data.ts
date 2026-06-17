/**
 * cleanup-seed-data.ts
 *
 * Supprime toutes les données de test LIÉES AUX COMPTES SEED
 * (candidatures, dossiers, baux, paiements, messages, notifications, etc.)
 * mais CONSERVE les utilisateurs (profils) et leurs biens (properties).
 *
 * ATTENTION : un même compte peut avoir les deux rôles (LOCATAIRE + PROPRIETAIRE).
 * Le script supprime TOUTES les données associées (tenant + owner) quel que soit
 * le rôle actif.
 *
 * Utilisation :
 *   node --env-file=.env.local --experimental-transform-types scripts/cleanup-seed-data.ts
 *   node --env-file=.env.local --experimental-transform-types scripts/cleanup-seed-data.ts --force
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  console.error('   Usage: node --env-file=.env.local --experimental-transform-types scripts/cleanup-seed-data.ts')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const SEED_EMAILS = [
  'admin@montoit.ci',
  'tc@montoit.ci',
  'proprietaire@montoit.ci',
  'awa.diallo@email.ci',
  'locataire@montoit.ci',
  'fatou.b@email.ci',
  'jean.c@email.ci',
  'agence@montoit.ci',
  'nadia.k@email.ci',
]

interface UserInfo {
  id: string
  email: string
  role: string
  activeRole: string | null
}

// ─── Tables à nettoyer (FK column → table) ─────────────────────────────────
// Ordre respecte les dépendances (enfants avant parents).
// `users` et `properties` ne sont PAS inclus.

type DeleteSpec = { table: string; column: string }

const DELETE_SPECS: DeleteSpec[] = [
  // enfant → parent
  { table: 'commissions',                   column: 'agency_id' },
  { table: 'agency_agents',                 column: 'agency_id' },  // cascade supprime agency_agent_properties
  { table: 'signalements',                  column: 'reporter_id' },
  { table: 'maintenance_comments',          column: 'author_id' },
  { table: 'maintenance_requests',          column: 'tenant_id' },
  { table: 'payments',                      column: 'tenant_id' },
  { table: 'notifications',                 column: 'user_id' },
  { table: 'validation_slas',               column: 'reviewer_id' },
  { table: 'disputes',                      column: 'reported_by_id' },
  { table: 'ratings',                       column: 'from_user_id' },
  { table: 'message_attachments',           column: 'message_id' },  // via message → sender_id
  { table: 'messages',                      column: 'sender_id' },
  { table: 'conversations',                 column: 'participant1_id' },
  { table: 'conversations',                 column: 'participant2_id' },
  { table: 'inventory_report_items',        column: 'report_id' },  // via report → reviewer_id
  { table: 'inventory_reports',             column: 'reviewer_id' },
  { table: 'missions',                      column: 'tc_id' },
  { table: 'verification_agents',           column: 'tc_id' },
  { table: 'fraud_alerts',                  column: 'reporter_id' },
  { table: 'fraud_alerts',                  column: 'suspect_id' },
  { table: 'certifications',                column: 'user_id' },
  { table: 'facial_verifications',          column: 'user_id' },
  { table: 'mandats',                       column: 'owner_id' },
  { table: 'leases',                        column: 'tenant_id' },
  { table: 'applications',                  column: 'tenant_id' },
  { table: 'rental_file_documents',         column: 'rental_file_id' },  // via rental_file → tenant_id
  { table: 'rental_files',                  column: 'tenant_id' },
  { table: 'owner_file_documents',          column: 'owner_file_id' },  // via owner_file → owner_id
  { table: 'owner_files',                   column: 'owner_id' },
  { table: 'ownership_documents',           column: 'owner_id' },
  { table: 'visit_requests',                column: 'tenant_id' },
  { table: 'favorites',                     column: 'user_id' },
  { table: 'property_documents',            column: 'property_id' },  // via property → owner_id
  { table: 'property_images',               column: 'property_id' },  // via property → owner_id
  { table: 'audit_logs',                    column: 'user_id' },
  { table: 'otp_codes',                     column: 'user_id' },
  { table: 'sessions',                      column: 'user_id' },
  { table: 'connection_logs',               column: 'user_id' },
  { table: 'signature_aliases',             column: 'user_id' },
  { table: 'notification_preferences',      column: 'user_id' },
]

// ─── Inspection ────────────────────────────────────────────────────────────

async function findSeedUsers(): Promise<Map<string, UserInfo>> {
  console.log('\n🔍 Recherche des comptes seed…\n')

  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, role, active_role')
    .in('email', SEED_EMAILS)

  if (error) {
    console.error(`❌ Erreur chargement utilisateurs: ${error.message}`)
    process.exit(1)
  }

  const userMap = new Map<string, UserInfo>()

  for (const u of users ?? []) {
    const info: UserInfo = {
      id: u.id,
      email: u.email.toLowerCase(),
      role: u.role,
      activeRole: u.active_role ?? null,
    }
    userMap.set(info.email, info)
    console.log(`  ${info.email.padEnd(30)} id=${info.id.slice(0, 8)}…  role=${info.role}  active_role=${info.activeRole ?? '-'}`)
  }

  if (userMap.size === 0) {
    console.log('\n✅ Aucun compte seed trouvé.')
    return userMap
  }

  console.log(`\n📋 ${userMap.size} compte(s) trouvé(s) sur ${SEED_EMAILS.length} déclaré(s).`)
  return userMap
}

async function countForTable(table: string, column: string, userId: string): Promise<number> {
  try {
    // For indirect tables, resolve the parent IDs first
    if (column === 'rental_file_id') {
      const { data: rfs } = await supabase.from('rental_files').select('id').eq('tenant_id', userId)
      if (!rfs || rfs.length === 0) return 0
      const { count } = await supabase.from(table as any).select('id', { count: 'exact', head: true }).in('rental_file_id', rfs.map(r => r.id))
      return count ?? 0
    }
    if (column === 'owner_file_id') {
      const { data: ofs } = await supabase.from('owner_files').select('id').eq('owner_id', userId)
      if (!ofs || ofs.length === 0) return 0
      const { count } = await supabase.from(table as any).select('id', { count: 'exact', head: true }).in('owner_file_id', ofs.map(o => o.id))
      return count ?? 0
    }
    if (column === 'property_id') {
      const { data: props } = await supabase.from('properties').select('id').eq('owner_id', userId)
      if (!props || props.length === 0) return 0
      const { count } = await supabase.from(table as any).select('id', { count: 'exact', head: true }).in('property_id', props.map(p => p.id))
      return count ?? 0
    }
    if (column === 'message_id') {
      const { data: msgs } = await supabase.from('messages').select('id').eq('sender_id', userId)
      if (!msgs || msgs.length === 0) return 0
      const { count } = await supabase.from(table as any).select('id', { count: 'exact', head: true }).in('message_id', msgs.map(m => m.id))
      return count ?? 0
    }
    if (column === 'report_id') {
      const { data: reports } = await supabase.from('inventory_reports').select('id').eq('reviewer_id', userId)
      if (!reports || reports.length === 0) return 0
      const { count } = await supabase.from(table as any).select('id', { count: 'exact', head: true }).in('report_id', reports.map(r => r.id))
      return count ?? 0
    }
    if (column === 'agency_id') {
      const { count } = await supabase.from(table as any).select('id', { count: 'exact', head: true }).eq(column, userId)
      return count ?? 0
    }

    const { count } = await supabase
      .from(table as any)
      .select('id', { count: 'exact', head: true })
      .eq(column, userId)
    return count ?? 0
  } catch {
    return 0
  }
}

async function inspectDetails(userMap: Map<string, UserInfo>) {
  const categoryOrder = [
    { label: '📄 Dossiers locataires', tables: ['rental_files', 'rental_file_documents'] },
    { label: '📄 Dossiers propriétaires', tables: ['owner_files', 'owner_file_documents', 'ownership_documents'] },
    { label: '📋 Candidatures', tables: ['applications'] },
    { label: '📝 Baux', tables: ['leases'] },
    { label: '💰 Paiements', tables: ['payments'] },
    { label: '🔧 Maintenances', tables: ['maintenance_requests', 'maintenance_comments'] },
    { label: '📅 Visites', tables: ['visit_requests'] },
    { label: '💬 Messages', tables: ['messages', 'message_attachments', 'conversations'] },
    { label: '⭐ Avis', tables: ['ratings'] },
    { label: '⚖️ Litiges', tables: ['disputes'] },
    { label: '🔔 Notifications', tables: ['notifications', 'notification_preferences'] },
    { label: '❤️ Favoris', tables: ['favorites'] },
    { label: '🏢 Agence', tables: ['agency_agents', 'commission'] },
    { label: '📝 Mandats', tables: ['mandats'] },
    { label: '🔐 Sessions / OTP', tables: ['sessions', 'otp_codes', 'connection_logs', 'signature_aliases'] },
    { label: '📋 Divers', tables: ['audit_logs', 'signalements', 'fraud_alerts', 'certifications', 'facial_verifications', 'missions', 'verification_agents', 'validation_slas', 'inventory_reports', 'inventory_report_items'] },
    { label: '🏠 Biens (conservés)', tables: ['properties'] },
  ]

  console.log('\n🔎 Synthèse des données à supprimer…\n')

  for (const [email, info] of userMap) {
    console.log(`  ${email}:`)
    for (const cat of categoryOrder) {
      let total = 0
      for (const table of cat.tables) {
        const spec = DELETE_SPECS.find(s => s.table === table)
        if (!spec) continue
        total += await countForTable(table, spec.column, info.id)
      }
      if (total > 0) {
        console.log(`    ${cat.label}: ${total}`)
      }
    }
    console.log()
  }
}

// ─── Nettoyage ─────────────────────────────────────────────────────────────

async function deleteForTable(spec: DeleteSpec, ids: string[]): Promise<number> {
  try {
    // Resolve indirect FK chains
    if (spec.column === 'rental_file_id') {
      const { data: parents } = await supabase.from('rental_files').select('id').in('tenant_id', ids)
      if (!parents || parents.length === 0) return 0
      const parentIds = parents.map(r => r.id)
      const { count } = await supabase.from(spec.table as any).delete({ count: 'exact' }).in('rental_file_id', parentIds)
      return count ?? 0
    }
    if (spec.column === 'owner_file_id') {
      const { data: parents } = await supabase.from('owner_files').select('id').in('owner_id', ids)
      if (!parents || parents.length === 0) return 0
      const parentIds = parents.map(o => o.id)
      const { count } = await supabase.from(spec.table as any).delete({ count: 'exact' }).in('owner_file_id', parentIds)
      return count ?? 0
    }
    if (spec.column === 'property_id') {
      const { data: parents } = await supabase.from('properties').select('id').in('owner_id', ids)
      if (!parents || parents.length === 0) return 0
      const parentIds = parents.map(p => p.id)
      const { count } = await supabase.from(spec.table as any).delete({ count: 'exact' }).in('property_id', parentIds)
      return count ?? 0
    }
    if (spec.column === 'message_id') {
      const { data: parents } = await supabase.from('messages').select('id').in('sender_id', ids)
      if (!parents || parents.length === 0) return 0
      const parentIds = parents.map(m => m.id)
      const { count } = await supabase.from(spec.table as any).delete({ count: 'exact' }).in('message_id', parentIds)
      return count ?? 0
    }
    if (spec.column === 'report_id') {
      const { data: parents } = await supabase.from('inventory_reports').select('id').in('reviewer_id', ids)
      if (!parents || parents.length === 0) return 0
      const parentIds = parents.map(r => r.id)
      const { count } = await supabase.from(spec.table as any).delete({ count: 'exact' }).in('report_id', parentIds)
      return count ?? 0
    }

    const { count, error } = await supabase
      .from(spec.table as any)
      .delete({ count: 'exact' })
      .in(spec.column, ids)

    if (error) {
      console.error(`  ✗ ${spec.table} (${spec.column}): ${error.message}`)
      return 0
    }
    return count ?? 0
  } catch (e: any) {
    console.error(`  ✗ ${spec.table} (${spec.column}): ${e.message}`)
    return 0
  }
}

async function cleanup(userMap: Map<string, UserInfo>) {
  const ids = [...userMap.values()].map(u => u.id)

  console.log('🧹 Suppression des données…\n')

  let totalDeleted = 0
  for (const spec of DELETE_SPECS) {
    const deleted = await deleteForTable(spec, ids)
    if (deleted > 0) {
      console.log(`  ✓ ${spec.table} (${spec.column}): ${deleted} supprimé(s)`)
      totalDeleted += deleted
    }
  }

  console.log(`\n  📊 Total: ${totalDeleted} enregistrements supprimés`)
  console.log('    (utilisateurs et biens conservés intacts)')
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('═'.repeat(55))
  console.log('  NETTOYAGE DES DONNÉES DE SEED')
  console.log('  (utilisateurs et biens conservés)')
  console.log('═'.repeat(55))

  const userMap = await findSeedUsers()
  if (userMap.size === 0) {
    console.log('\nRien à faire.\n')
    return
  }

  await inspectDetails(userMap)

  console.log('═'.repeat(55))

  const isDryRun = !(process.argv.includes('--force') || process.argv.includes('-f'))
  if (isDryRun) {
    console.log('\n⚠️  Mode simulation — aucune suppression effectuée.')
    console.log('   Ajoutez --force ou -f pour exécuter la suppression.\n')
    return
  }

  await cleanup(userMap)

  console.log('\n' + '═'.repeat(55))
  console.log('  ✅ Nettoyage terminé.')
  console.log('═'.repeat(55) + '\n')
}

main().catch(console.error)
