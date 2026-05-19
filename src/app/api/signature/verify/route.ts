import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/request-user'

export async function POST(req: NextRequest) {
  try {
    const { userId, accessToken, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json()
    const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sign-verify`

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
    const message = error instanceof Error ? error.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
