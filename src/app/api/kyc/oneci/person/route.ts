import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { getEdgeFunctionBearerToken } from '@/lib/get-edge-function-bearer-token'

export async function GET(req: NextRequest) {
  try {
    const { userId, accessToken, authSource, applyCookies } = await resolveRequestUser(req)
    if (!userId) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })
    const nni = req.nextUrl.searchParams.get('nni')
    if (!nni) return NextResponse.json({ message: 'Le NNI est requis' }, { status: 400 })
    const bearerToken = getEdgeFunctionBearerToken(accessToken, authSource)
    if (!bearerToken) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })
    const headers: Record<string, string> = { Authorization: `Bearer ${bearerToken}` }
    if (!accessToken) headers['x-user-id'] = userId
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/oneci-person?nni=${encodeURIComponent(nni)}`, { headers })
    const data = await response.json()
    const result = NextResponse.json(data, { status: response.status })
    const retryAfter = response.headers.get('Retry-After')
    if (retryAfter) result.headers.set('Retry-After', retryAfter)
    return applyCookies(result)
  } catch (error) {
    console.error('[RNPP] Person proxy error:', error)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 502 })
  }
}
