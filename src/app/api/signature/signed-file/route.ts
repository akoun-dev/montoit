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

    const { searchParams } = new URL(req.url)
    const fileName = searchParams.get('fileName')

    if (!fileName) {
      return NextResponse.json({ error: 'fileName requis' }, { status: 400 })
    }

    const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/signed-file?fileName=${encodeURIComponent(fileName)}`

    const res = await fetch(functionUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return applyCookies(NextResponse.json(data, { status: res.status }))
    }

    const arrayBuffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'application/pdf'

    return applyCookies(
      new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      }),
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
