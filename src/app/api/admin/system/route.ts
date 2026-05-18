import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const admin = getSupabaseAdminClient()
    const { data: profile } = await admin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile || profile.role !== 'ADMIN') {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    const [
      totalUsers,
      totalProperties,
      totalLeases,
      totalDisputes,
      totalSignalements,
      connectionLogsCount,
      failedLogins,
    ] = await Promise.all([
      admin.from('users').select('id', { count: 'exact', head: true }).then(r => r.count || 0),
      admin.from('properties').select('id', { count: 'exact', head: true }).then(r => r.count || 0),
      admin.from('leases').select('id', { count: 'exact', head: true }).then(r => r.count || 0),
      admin.from('disputes').select('id', { count: 'exact', head: true }).then(r => r.count || 0),
      admin.from('signalements').select('id', { count: 'exact', head: true }).then(r => r.count || 0),
      admin.from('connection_logs').select('id', { count: 'exact', head: true }).then(r => r.count || 0),
      admin.from('audit_logs').select('id', { count: 'exact', head: true }).eq('action', 'LOGIN_FAILED').then(r => r.count || 0),
    ])

    // Revenue by month (last 6 months)
    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const { data: activeLeases } = await admin
      .from('leases')
      .select('monthly_rent, charges, created_at')
      .eq('status', 'ACTIVE')

    const revenueByMonth: Record<string, number> = {}
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      revenueByMonth[key] = 0
    }
    ;(activeLeases || []).forEach((lease: any) => {
      const d = new Date(lease.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (revenueByMonth[key] !== undefined) {
        revenueByMonth[key] += lease.monthly_rent + lease.charges
      }
    })

    // Recent connection logs
    const { data: recentConnections } = await admin
      .from('connection_logs')
      .select('*, user:users!connection_logs_user_id_fkey(id, first_name, last_name, email)')
      .order('created_at', { ascending: false })
      .limit(20)

    // Recent failed login attempts
    const { data: recentFailedLogins } = await admin
      .from('audit_logs')
      .select('*, user:users!audit_logs_user_id_fkey(id, first_name, last_name, email)')
      .eq('action', 'LOGIN_FAILED')
      .order('created_at', { ascending: false })
      .limit(20)

    // Monthly new users (last 6 months)
    const monthlyNewUsers: Record<string, number> = {}
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString()
      const { count } = await admin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth)
      monthlyNewUsers[key] = count || 0
    }

    const resp = NextResponse.json({
      stats: {
        totalUsers,
        totalProperties,
        totalLeases,
        totalDisputes,
        totalSignalements,
        connectionLogsCount,
        failedLogins,
      },
      revenueByMonth,
      monthlyNewUsers,
      recentConnections,
      recentFailedLogins,
      systemHealth: {
        database: 'OK',
        api: 'OK',
        storage: await checkStorageHealth(),
      },
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Admin system GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

async function checkStorageHealth(): Promise<string> {
  try {
    const { data } = await getSupabaseAdminClient().storage.listBuckets()
    const hasRequiredBuckets = ['avatars', 'property-images'].every((name) =>
      data?.some((b: any) => b.name === name && b.public)
    )
    return hasRequiredBuckets ? 'OK' : 'DEGRADED'
  } catch {
    return 'ERROR'
  }
}
