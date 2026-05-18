import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { supabase, applyCookies } = createRouteHandlerSupabaseClient(req)
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json()
    const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/oneci-face-auth`

    const res = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    return applyCookies(NextResponse.json(data, { status: res.status }))
  } catch (error) {
    console.error('[ONECI] Proxy error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
