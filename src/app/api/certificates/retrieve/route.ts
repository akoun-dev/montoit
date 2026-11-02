import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { getEdgeFunctionBearerToken } from '@/lib/get-edge-function-bearer-token'

export async function POST(req: NextRequest) {
  try {
    const { userId, accessToken, authSource, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const body = await req.json()
    const { email, phone, alias, name, onlyAlias } = body

    const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/retrieve-certificates`
    const bearerToken = getEdgeFunctionBearerToken(accessToken, authSource)
    if (!bearerToken) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const res = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
        ...(accessToken ? {} : { 'x-user-id': userId }),
      },
      body: JSON.stringify({
        alias: alias || '',
        name: name || '',
        phone: phone || '',
        state: '',
        email: email || '',
        onlyAlias: onlyAlias || '',
      }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      const resp = NextResponse.json({
        error: errData.error || 'Erreur lors de la récupération des certificats',
      }, { status: res.status })
      return applyCookies(resp)
    }

    const data = await res.json()
    const resp = NextResponse.json(data)
    return applyCookies(resp)
  } catch (error) {
    console.error('Certificate retrieval error:', error)
    const resp = NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return resp
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId, accessToken, authSource, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')
    const phone = searchParams.get('phone')
    const alias = searchParams.get('alias')

    const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/retrieve-certificates`
    const bearerToken = getEdgeFunctionBearerToken(accessToken, authSource)
    if (!bearerToken) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const queryParams = new URLSearchParams()
    if (email) queryParams.set('email', email)
    if (phone) queryParams.set('phone', phone)
    if (alias) queryParams.set('alias', alias)

    const res = await fetch(`${functionUrl}?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        ...(accessToken ? {} : { 'x-user-id': userId }),
      },
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      const resp = NextResponse.json({
        error: errData.error || 'Erreur lors de la récupération des certificats',
      }, { status: res.status })
      return applyCookies(resp)
    }

    const data = await res.json()
    const resp = NextResponse.json(data)
    return applyCookies(resp)
  } catch (error) {
    console.error('Certificate retrieval error:', error)
    const resp = NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return resp
  }
}
