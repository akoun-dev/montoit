import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notifySecurityAlert } from '@/lib/notify'

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
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile || profile.role !== 'ADMIN') {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    const url = new URL(req.url)
    const search = url.searchParams.get('search')
    const role = url.searchParams.get('role')
    const sortBy = url.searchParams.get('sortBy') || 'created_at'
    const sortOrder = url.searchParams.get('sortOrder') || 'desc'

    let query = supabase.from('users').select('*', { count: 'exact' })
    if (role) query = query.eq('role', role as any)
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    const { data: users, count: totalUsers } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })

    const mapped = (users ?? []).map((u: any) => ({
      id: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      activeRole: u.active_role,
      isActive: u.is_active,
      isEmailVerified: u.is_email_verified,
      createdAt: u.created_at,
      avatarUrl: u.avatar_url,
    }))

    // Compute stats
    const activeCount = (users ?? []).filter((u: any) => u.is_active).length
    const inactiveCount = (totalUsers ?? 0) - activeCount
    const byRole: Record<string, number> = {}
    for (const u of users ?? []) {
      byRole[u.role] = (byRole[u.role] || 0) + 1
    }

    const resp = NextResponse.json({
      users: mapped,
      stats: {
        total: totalUsers ?? 0,
        active: activeCount,
        inactive: inactiveCount,
        byRole,
      },
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Admin users GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile || profile.role !== 'ADMIN') {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    const body = await req.json()
    const { userId: targetUserId, role, isActive } = body

    if (!targetUserId) {
      return NextResponse.json({ error: 'ID utilisateur requis' }, { status: 400 })
    }

    if (targetUserId === userId) {
      return NextResponse.json({ error: 'Vous ne pouvez pas modifier votre propre compte' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (role) {
      updateData.role = role
      updateData.active_role = role
    }
    if (isActive !== undefined) updateData.is_active = isActive

    const { data: user } = await supabase
      .from('users')
      .update(updateData as any)
      .eq('id', targetUserId)
      .select()
      .single()

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    await supabase.from('audit_logs').insert({
      action: isActive === false ? 'USER_BANNED' : role ? 'USER_ROLE_CHANGED' : 'USER_REACTIVATED',
      entity: 'User',
      entity_id: targetUserId,
      details: JSON.stringify({ role, isActive, modifiedBy: userId }),
      user_id: userId,
    } as any)

    if (isActive === false) {
      await notifySecurityAlert(targetUserId, 'Compte suspendu', 'Votre compte a été suspendu par un administrateur. Contactez le support si vous pensez qu\'il s\'agit d\'une erreur.')
    } else if (isActive === true) {
      await notifySecurityAlert(targetUserId, 'Compte réactivé', 'Votre compte a été réactivé par un administrateur.')
    }
    if (role) {
      await notifySecurityAlert(targetUserId, 'Changement de rôle', `Votre rôle a été modifié par un administrateur. Nouveau rôle : ${role}.`)
    }

    const resp = NextResponse.json({
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        activeRole: user.active_role,
        isActive: user.is_active,
        createdAt: user.created_at,
      },
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Admin users PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
