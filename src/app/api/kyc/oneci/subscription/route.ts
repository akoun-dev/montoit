import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { getEdgeFunctionBearerToken } from '@/lib/get-edge-function-bearer-token'

export async function GET(req: NextRequest) {
  try {
    const { userId, accessToken, authSource, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/oneci-subscription`

    const bearerToken = getEdgeFunctionBearerToken(accessToken, authSource)
    if (!bearerToken) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const headers: Record<string, string> = {
      Authorization: `Bearer ${bearerToken}`,
    }
    if (!accessToken) {
      headers['x-user-id'] = userId
    }

    const res = await fetch(functionUrl, {
      method: 'GET',
      headers,
    })

    const data = await res.json()
    return applyCookies(NextResponse.json(data, { status: res.status }))
  } catch (error) {
    console.error('[ONECI] Proxy error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
