import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { supabase, applyCookies } = createRouteHandlerSupabaseClient(req)
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/oneci-subscription`

    const res = await fetch(functionUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await res.json()
    return applyCookies(NextResponse.json(data, { status: res.status }))
  } catch (error) {
    console.error('[ONECI] Proxy error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
