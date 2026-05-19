import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { SESSION_COOKIE_NAME, getSessionExpiry } from '@/lib/session'

export async function resolveRequestUser(
  req: NextRequest,
): Promise<{
  userId: string | null
  accessToken: string | null
  authSource: 'supabase' | 'session' | null
  applyCookies: (response: NextResponse) => NextResponse
}> {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(req)

  // Log cookie names (not values) for debugging
  const cookieNames = req.cookies.getAll().map((c) => c.name)
  console.log('[resolveRequestUser] Cookie names:', cookieNames)

  // 1. Try Supabase Auth session (used by email login)
  // getSession() returns both the user and the access token (JWT)
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.user?.id) {
      console.log(
        '[resolveRequestUser] Resolved via Supabase session:',
        session.user.id,
      )
      return {
        userId: session.user.id,
        accessToken: session.access_token,
        authSource: 'supabase',
        applyCookies,
      }
    }

    // getSession() returned null — try getUser() as fallback
    // (getUser() doesn't return an access token but may succeed where getSession() doesn't)
    console.log(
      '[resolveRequestUser] getSession() returned null, trying getUser()...',
    )
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user?.id) {
      console.log(
        '[resolveRequestUser] Resolved via Supabase getUser():',
        user.id,
      )
      return {
        userId: user.id,
        accessToken: null, // no access token from getUser()
        authSource: 'supabase',
        applyCookies,
      }
    }
  } catch (error) {
    console.error('[resolveRequestUser] Supabase Auth error:', error)
    // Fall through to session cookie fallback
  }

  // 2. Fallback: check custom session cookie (used by SMS OTP login)
  const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value
  console.log('[resolveRequestUser] SESSION_COOKIE_NAME:', SESSION_COOKIE_NAME)
  console.log('[resolveRequestUser] Session token present:', !!sessionToken)

  if (sessionToken) {
    try {
      const admin = getSupabaseAdminClient()
      const { data: session } = await (admin
        .from('sessions')
        .select('user_id, expires_at')
        .eq('token', sessionToken)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle() as any)

      if (session) {
        const userId = (
          session as { user_id: string; expires_at: string }
        ).user_id
        console.log(
          '[resolveRequestUser] Resolved via custom session:',
          userId,
        )
        return {
          userId,
          accessToken: null, // custom sessions don't have Supabase JWT
          authSource: 'session',
          applyCookies(response) {
            // Slide the custom session expiry
            const newExpiry = getSessionExpiry()
            response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: Math.floor(
                (newExpiry.getTime() - Date.now()) / 1000,
              ),
              path: '/',
            })
            return response
          },
        }
      } else {
        console.log(
          '[resolveRequestUser] Custom session not found or expired',
        )
      }
    } catch (error) {
      console.error(
        '[resolveRequestUser] Custom session lookup error:',
        error,
      )
    }
  }

  console.log('[resolveRequestUser] Could not resolve user — returning null')
  return {
    userId: null,
    accessToken: null,
    authSource: null,
    applyCookies,
  }
}
