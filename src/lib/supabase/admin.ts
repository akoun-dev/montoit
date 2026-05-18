import 'server-only'

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

let adminClient: SupabaseClient<Database> | undefined

function getSupabaseAdminEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase admin environment variables.')
  }

  return { url, serviceRoleKey }
}

export function getSupabaseAdminClient(): SupabaseClient<Database> {
  if (!adminClient) {
    const { url, serviceRoleKey } = getSupabaseAdminEnv()
    adminClient = createClient<Database>(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  return adminClient
}

