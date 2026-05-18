import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const { data: profile } = await supabase
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single()

    const effectiveRole = profile?.active_role || profile?.role

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''

    if (!q || q.length < 2) {
      const resp = NextResponse.json({ users: [] })
      return applyCookies(resp)
    }

    let query = supabase
      .from('users')
      .select('id, first_name, last_name, avatar_url, role')
      .eq('is_active', true)
      .neq('id', userId)
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(10)

    if (effectiveRole === 'LOCATAIRE') {
      query = query.in('role', ['PROPRIETAIRE', 'AGENCE'])
    } else if (effectiveRole === 'PROPRIETAIRE') {
      query = query.in('role', ['LOCATAIRE'])
    }

    const { data: users } = await query

    const mapped = (users || []).map((u: any) => ({
      id: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
      avatarUrl: u.avatar_url,
      role: u.role,
    }))

    const resp = NextResponse.json({ users: mapped })
    return applyCookies(resp)
  } catch (error) {
    console.error('User search error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
