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

    const { searchParams } = new URL(req.url)
    const role = searchParams.get('role')
    const q = searchParams.get('q') || ''

    let query = supabase
      .from('users')
      .select('id, first_name, last_name, email, avatar_url, role, active_role')
      .eq('is_active', true)
      .neq('id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (role) {
      query = query.or(`role.eq.${role},active_role.eq.${role}`)
    }

    if (q && q.length >= 2) {
      query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
    }

    const { data: users } = await query

    const mapped = (users || []).map((u: any) => ({
      id: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.email,
      avatarUrl: u.avatar_url,
      role: u.role,
      activeRole: u.active_role,
    }))

    const resp = NextResponse.json({ users: mapped })
    return applyCookies(resp)
  } catch (error) {
    console.error('Users list error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
