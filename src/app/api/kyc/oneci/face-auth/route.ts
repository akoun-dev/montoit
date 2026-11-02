import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { getEdgeFunctionBearerToken } from '@/lib/get-edge-function-bearer-token'
import { checkRateLimit } from '@/lib/rate-limiter'

export async function POST(req: NextRequest) {
  try {
    const { userId, accessToken, authSource, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // SEC-012 — Rate-limit 5/min par utilisateur (+ IP, standard kyc/face-auth).
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const { allowed } = checkRateLimit('kyc-oneci-face-auth', `${userId}:${ip}`, { maxRequests: 5, windowMs: 60_000 })
    if (!allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Veuillez réessayer dans une minute.' },
        { status: 429 },
      )
    }

    const contentLength = Number(req.headers.get('content-length') || 0)
    if (contentLength > 2 * 1024 * 1024) return NextResponse.json({ message: 'Le payload facial dépasse 2 Mo' }, { status: 413 })
    const body = await req.json()
    const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/oneci-face-auth`

    const bearerToken = getEdgeFunctionBearerToken(accessToken, authSource)
    if (!bearerToken) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const headers: Record<string, string> = {
      Authorization: `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
    }
    if (!accessToken) {
      headers['x-user-id'] = userId
    }

    const res = await fetch(functionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    const data = await res.json()
    const response = NextResponse.json(data, { status: res.status })
    const retryAfter = res.headers.get('Retry-After')
    if (retryAfter) response.headers.set('Retry-After', retryAfter)
    return applyCookies(response)
  } catch (error) {
    console.error('[ONECI] Proxy error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
