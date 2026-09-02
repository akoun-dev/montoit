import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { getEdgeFunctionBearerToken } from '@/lib/get-edge-function-bearer-token'

export async function POST(req: NextRequest) {
  try {
    const { userId, accessToken, authSource, applyCookies } = await resolveRequestUser(req)
    if (!userId) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })
    const contentLength = Number(req.headers.get('content-length') || 0)
    if (contentLength > 1024 * 1024) return NextResponse.json({ message: 'Le payload empreinte dépasse 1 Mo' }, { status: 413 })
    const body = await req.json()
    const bearerToken = getEdgeFunctionBearerToken(accessToken, authSource)
    if (!bearerToken) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })
    const headers: Record<string, string> = { Authorization: `Bearer ${bearerToken}`, 'Content-Type': 'application/json' }
    if (!accessToken) headers['x-user-id'] = userId
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/oneci-fingerprint-auth`, { method: 'POST', headers, body: JSON.stringify(body) })
    const data = await response.json()
    const result = NextResponse.json(data, { status: response.status })
    const retryAfter = response.headers.get('Retry-After')
    if (retryAfter) result.headers.set('Retry-After', retryAfter)
    return applyCookies(result)
  } catch (error) {
    console.error('[RNPP] Fingerprint proxy error:', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 502 })
  }
}
