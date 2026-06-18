/**
 * cleanup-all-data.ts
 *
 * Supprime TOUTES les données de toutes les tables SAUF :
 *   - users (profils utilisateur)
 *   - properties (annonces/bien)
 *   - property_images (images des biens)
 *
 * ATTENTION : Opération destructive ! Les données supprimées sont irrécupérables.
 *
 * Utilisation :
 *   node --env-file=.env.local --experimental-transform-types scripts/cleanup-all-data.ts
 *   node --env-file=.env.local --experimental-transform-types scripts/cleanup-all-data.ts --force
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Tables à vider, dans l'ordre (enfants avant parents pour éviter les FK violations)
const TABLES_TO_CLEAR = [
  // Dépendances profondes (enfants)
  'message_attachments',
  'inventory_report_items',
  'maintenance_comments',
  'rental_file_documents',
  'owner_file_documents',
  'property_documents',
  'agency_agent_properties',

  // Niveau intermédiaire
  'payments',
  'applications',
  'leases',
  'messages',
  'inventory_reports',
  'maintenance_requests',
  'notifications',
  'notification_preferences',
  'favorites',
  'visit_requests',
  'ratings',
  'commissions',
  'mandats',
  'agency_agents',
  'signalements',
  'agent_feedback',
  'signature_aliases',
  'otp_codes',
  'sessions',
  'connection_logs',
  'audit_logs',
  'service_usage_logs',

  // Niveau parent
  'owner_files',
  'ownership_documents',
  'rental_files',
  'conversations',
  'disputes',
  'fraud_alerts',
  'certifications',
  'facial_verifications',
  'missions',
  'verification_agents',
  'validation_slas',
  'default_conditions',
  'platform_settings',
]

async function main() {
  console.log('═'.repeat(55))
  console.log('  NETTOYAGE COMPLET DE LA BASE DE DONNÉES')
  console.log('  (users + properties + property_images conservés)')
  console.log('═'.repeat(55))

  const isDryRun = !process.argv.includes('--force')
  
  if (isDryRun) {
    console.log('\n⚠️  Mode simulation — comptage des enregistrements...\n')
  } else {
    console.log('\n⚠️  Mode suppression — les données seront effacées !\n')
  }

  let totalFound = 0
  let totalDeleted = 0

  for (const table of TABLES_TO_CLEAR) {
    try {
      const { count, error } = await supabase
        .from(table as any)
        .select('id', { count: 'exact', head: true })

      if (error) {
        console.log(`  ? ${table.padEnd(30)} ${error.message}`)
        continue
      }

      const n = count ?? 0
      totalFound += n

      if (n === 0) {
        console.log(`  · ${table.padEnd(30)} 0`)
        continue
      }

      if (!isDryRun) {
        const { count: deleted } = await supabase
          .from(table as any)
          .delete({ count: 'exact' })
          .neq('id', '__dummy__')  // supprime tout

        const d = deleted ?? 0
        totalDeleted += d
        console.log(`  ✓ ${table.padEnd(30)} ${n} supprimé(s)`)
      } else {
        console.log(`  ∼ ${table.padEnd(30)} ${n} trouvé(s)`)
      }
    } catch (e: any) {
      console.log(`  ✗ ${table.padEnd(30)} ${e.message}`)
    }
  }

  console.log()
  if (isDryRun) {
    console.log(`  📊 Total trouvé : ${totalFound} enregistrements à supprimer`)
    console.log('\n  Pour exécuter la suppression, ajoutez --force')
  } else {
    console.log(`  ✅ ${totalDeleted} enregistrements supprimés`)
    console.log('  (users, properties et property_images conservés)')
  }
  console.log()
}

main().catch(console.error)
