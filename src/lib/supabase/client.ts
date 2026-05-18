'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/types'

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Missing Supabase browser environment variables.')
  }

  return { url, anonKey }
}

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    const { url, anonKey } = getSupabaseEnv()
    browserClient = createBrowserClient<Database>(url, anonKey)
  }

  return browserClient
}
