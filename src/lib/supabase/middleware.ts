import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/supabase/types'

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Missing Supabase middleware environment variables.')
  }

  return { url, anonKey }
}

export interface UpdateSessionResult {
  response: NextResponse
  user: {
    id: string
    email?: string
  } | null
}

export async function updateSession(request: NextRequest): Promise<UpdateSessionResult> {
  const { url, anonKey } = getSupabaseEnv()

  let response = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })

        response = NextResponse.next({
          request,
        })

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options as CookieOptions)
        })
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  return {
    response,
    user: user ? { id: user.id, email: user.email ?? undefined } : null,
  }
}

/** Récupère le rôle et le rôle actif d'un utilisateur depuis la table users */
export async function getUserRole(
  supabase: ReturnType<typeof createServerClient<Database>>,
  userId: string,
): Promise<{ role: string; activeRole: string } | null> {
  const { data: profile } = await (supabase as any)
    .from('users')
    .select('role, active_role')
    .eq('id', userId)
    .single()

  if (!profile) return null

  return {
    role: profile.role,
    activeRole: profile.active_role || profile.role,
  }
}

