import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/supabase/types'

type PendingCookie = {
  name: string
  value: string
  options: CookieOptions
}

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Missing Supabase server environment variables.')
  }

  return { url, anonKey }
}

export function createRouteHandlerSupabaseClient(request: NextRequest) {
  const { url, anonKey } = getSupabaseEnv()
  const pendingCookies: PendingCookie[] = []

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach((cookie) => {
          pendingCookies.push(cookie)
        })
      },
    },
  })

  return {
    supabase,
    applyCookies(response: NextResponse) {
      pendingCookies.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options)
      })
      return response
    },
  }
}

export async function createServerComponentSupabaseClient() {
  const { url, anonKey } = getSupabaseEnv()
  const cookieStore = await cookies()

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // server components cannot always mutate cookies; middleware handles refresh
        }
      },
    },
  })
}
