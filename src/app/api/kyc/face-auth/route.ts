import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limiter'

export async function POST(req: NextRequest) {
  try {
    // Debug: log request info
    console.log('[KYC Face Auth] Cookies:', req.cookies.getAll())

    const { userId, accessToken, authSource, applyCookies } = await resolveRequestUser(req)

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const { allowed } = checkRateLimit('kyc-face-auth', `${userId}:${ip}`, { maxRequests: 5, windowMs: 60_000 })
    if (!allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Veuillez réessayer dans une minute.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/kyc-face-auth`

    // Use user's JWT as Bearer token (preferred by Supabase gateway)
    // Fall back to service role key if no access token (custom session)
    const bearerToken = accessToken || process.env.SUPABASE_SERVICE_ROLE_KEY
    const headers: Record<string, string> = {
      Authorization: `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
    }

    // When using service role key, also pass the user ID
    if (!accessToken) {
      headers['x-user-id'] = userId
    }

    const res = await fetch(functionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    const data = await res.json()
    return applyCookies(NextResponse.json(data, { status: res.status }))
  } catch (error) {
    console.error('[KYC] Proxy error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
