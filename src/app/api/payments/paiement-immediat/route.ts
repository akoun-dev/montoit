import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/request-user'

// POST /api/payments/paiement-immediat — Proxy to Edge Function for wallet-to-wallet transfers
export async function POST(req: NextRequest) {
  try {
    const { userId, accessToken, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return applyCookies(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }))
    }

    const body = await req.json()
    const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/payment-transfer`

    const bearerToken = accessToken || process.env.SUPABASE_SERVICE_ROLE_KEY
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
    return applyCookies(NextResponse.json(data, { status: res.status }))
  } catch (error) {
    console.error('Payment transfer proxy error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors du transfert' },
      { status: 500 }
    )
  }
}
