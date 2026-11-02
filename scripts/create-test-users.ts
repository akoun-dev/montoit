import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import * as path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PASSWORD = 'Test1234!'
const SUPABASE_PASSWORD_PLACEHOLDER = '__managed_by_supabase_auth__'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local')
  console.error(`Usage: node --env-file=.env.local --experimental-transform-types scripts/create-test-users.ts`)
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const USERS = [
  { email: 'locataire@montoit.ci',    firstName: 'Moussa',    lastName: 'Koné',       phone: '+22505050505', role: 'LOCATAIRE' },
  { email: 'proprietaire@montoit.ci', firstName: 'Kouadio',   lastName: 'Yao',        phone: '+22503030303', role: 'PROPRIETAIRE' },
  { email: 'agence@montoit.ci',       firstName: 'Immobilier', lastName: 'Cocody',     phone: '+22508080808', role: 'AGENCE' },
  { email: 'tc@montoit.ci',           firstName: 'Aya',       lastName: 'Diabaté',    phone: '+22502020202', role: 'TIERS_CONFIANCE' },
  { email: 'admin@montoit.ci',        firstName: 'Admin',     lastName: 'Toit',       phone: '+22501010101', role: 'ADMIN' },
]

async function createAuthUser(email: string, firstName: string, lastName: string) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { firstName, lastName },
  })
  if (error || !data?.user) throw error || new Error(`Failed to create auth user for ${email}`)
  return data.user.id
}

async function upsert() {
  for (const u of USERS) {
    const email = u.email.toLowerCase().trim()
    console.log(`\n--- ${email} (${u.role}) ---`)

    const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle()
    if (existing) {
      const { data: authExists } = await supabase.auth.admin.getUserById(existing.id)
      if (authExists?.user) {
        await supabase.auth.admin.deleteUser(existing.id)
      }
      await supabase.from('users').delete().eq('id', existing.id)
      console.log('  Supprimé ancien utilisateur')
    }

    const id = await createAuthUser(email, u.firstName, u.lastName)
    const { error: insertError } = await supabase.from('users').insert({
      id,
      email,
      phone: u.phone,
      first_name: u.firstName,
      last_name: u.lastName,
      password_hash: SUPABASE_PASSWORD_PLACEHOLDER,
      role: u.role,
      active_role: u.role,
      is_email_verified: true,
      is_phone_verified: true,
      is_active: true,
    })
    if (insertError) {
      console.error(`  ERREUR insertion public.users: ${insertError.message}`)
      continue
    }
    console.log(`  ✓ Créé (id: ${id.slice(0, 8)}…) — mot de passe: ${PASSWORD}`)
  }
}

upsert()
  .then(() => {
    console.log('\n✅ Terminé.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('\n❌ Erreur:', err.message)
    process.exit(1)
  })
