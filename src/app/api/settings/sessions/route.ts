import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

const SESSION_COOKIE_NAME = 'montoit-session'

export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()
    const currentToken = req.cookies.get(SESSION_COOKIE_NAME)?.value

    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, token, created_at, expires_at')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    const mapped = (sessions || []).map((s: any) => ({
      id: s.id,
      isCurrent: s.token === currentToken,
      createdAt: s.created_at,
      expiresAt: s.expires_at,
    }))

    const resp = NextResponse.json({ sessions: mapped })
    return applyCookies(resp)
  } catch (error) {
    console.error('Sessions GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()
    const currentToken = req.cookies.get(SESSION_COOKIE_NAME)?.value
    const body = await req.json().catch(() => ({}))
    const { sessionIds } = body as { sessionIds?: string[] }

    if (sessionIds && sessionIds.length > 0) {
      for (const sid of sessionIds) {
        const sessionResult = await supabase
          .from('sessions')
          .select('id, user_id, token')
          .eq('id', sid)
          .maybeSingle()
        const session = sessionResult.data as any

        if (session && session.user_id === userId && session.token !== currentToken) {
          await supabase.from('sessions').delete().eq('id', sid)
        }
      }
    } else {
      await supabase
        .from('sessions')
        .delete()
        .eq('user_id', userId)
        .neq('token', currentToken || '___none___')
    }

    await supabase.from('audit_logs').insert({
      action: 'REVOKE_SESSIONS',
      entity: 'Session',
      user_id: userId,
    })

    const resp = NextResponse.json({ message: 'Sessions révoquées avec succès' })
    return applyCookies(resp)
  } catch (error) {
    console.error('Sessions DELETE error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
