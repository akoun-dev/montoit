import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!url || !key) {
  console.error('❌ Missing SUPABASE env vars')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TABLES = [
  'users',
  'properties',
  'property_images',
  'property_documents',
  'rental_files',
  'rental_file_documents',
  'applications',
  'owner_files',
  'owner_file_documents',
  'ownership_documents',
  'leases',
  'payments',
  'visit_requests',
  'favorites',
  'messages',
  'conversations',
  'message_attachments',
  'notifications',
  'notification_preferences',
  'maintenance_requests',
  'maintenance_comments',
  'disputes',
  'ratings',
  'audit_logs',
  'otp_codes',
  'sessions',
  'connection_logs',
  'signature_aliases',
  'mandats',
  'commissions',
  'agency_agents',
  'signalements',
  'inventory_reports',
  'inventory_report_items',
  'missions',
  'verification_agents',
  'fraud_alerts',
  'certifications',
  'facial_verifications',
  'validation_slas',
  'agent_feedback',
  'default_conditions',
  'service_usage_logs',
  'platform_settings',
]

async function main() {
  console.log('═'.repeat(50))
  console.log('  INSPECTION DE LA BASE DE DONNÉES')
  console.log('═'.repeat(50))
  console.log()

  const counts: { table: string; count: number }[] = []

  for (const table of TABLES) {
    try {
      const { count, error } = await supabase
        .from(table as any)
        .select('id', { count: 'exact', head: true })

      if (error) {
        console.log(`  ? ${table.padEnd(30)} erreur: ${error.message}`)
        continue
      }
      counts.push({ table, count: count ?? 0 })
      console.log(`  ${(count ?? 0).toString().padStart(6)}  ${table}`)
    } catch (e: any) {
      console.log(`  ? ${table.padEnd(30)} ${e.message}`)
    }
  }

  const total = counts.reduce((s, c) => s + c.count, 0)
  const toDelete = counts.filter(c => c.table !== 'users' && c.table !== 'properties')
  const totalToDelete = toDelete.reduce((s, c) => s + c.count, 0)

  console.log()
  console.log(`  📊 Total enregistrements : ${total}`)
  console.log(`  🗑️  À supprimer (hors users/properties) : ${totalToDelete}`)
  console.log(`  ✅ Users conservés : ${counts.find(c => c.table === 'users')?.count ?? 0}`)
  console.log(`  ✅ Propriétés conservées : ${counts.find(c => c.table === 'properties')?.count ?? 0}`)
  console.log()
}

main().catch(console.error)
