import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import type { UserRole } from '@/lib/supabase/types'

const ALLOWED_ROLES: UserRole[] = ['LOCATAIRE', 'PROPRIETAIRE', 'AGENCE']

export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    // Verify TC or ADMIN role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile || !['TIERS_CONFIANCE', 'ADMIN'].includes(profile.role)) {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    const url = new URL(req.url)
    const search = url.searchParams.get('search')
    const role = url.searchParams.get('role')
    const sortBy = url.searchParams.get('sortBy') || 'created_at'
    const sortOrder = url.searchParams.get('sortOrder') || 'desc'

    let query = supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, role, active_role, is_active, is_email_verified, is_phone_verified, avatar_url, created_at, city, company_name', { count: 'exact' })
      .in('role', ALLOWED_ROLES)

    if (role && (ALLOWED_ROLES as string[]).includes(role)) {
      query = query.eq('role', role as any)
    }
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
      isPhoneVerified: u.is_phone_verified,
      avatarUrl: u.avatar_url,
      city: u.city,
      companyName: u.company_name,
      createdAt: u.created_at,
    }))

    // Compute stats
    const activeCount = (users ?? []).filter((u: any) => u.is_active).length
    const byRole: Record<string, { total: number; active: number }> = {}
    for (const r of ALLOWED_ROLES) {
      const roleUsers = (users ?? []).filter((u: any) => u.role === r)
      byRole[r] = {
        total: roleUsers.length,
        active: roleUsers.filter((u: any) => u.is_active).length,
      }
    }

    const resp = NextResponse.json({
      users: mapped,
      stats: {
        total: totalUsers ?? 0,
        active: activeCount,
        inactive: (totalUsers ?? 0) - activeCount,
        byRole,
      },
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('TC users GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
