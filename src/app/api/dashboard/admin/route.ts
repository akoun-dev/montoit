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

    const now = new Date()

    const [
      totalUsers,
      totalProperties,
      totalLeases,
      totalDisputes,
      usersByRole,
      recentUsers,
      recentProperties,
      disputes,
      signalementsByStatus,
      failedLogins,
      connectionLogsCount,
    ] = await Promise.all([
      admin.from('users').select('id', { count: 'exact', head: true }).then(r => r.count || 0),
      admin.from('properties').select('id', { count: 'exact', head: true }).then(r => r.count || 0),
      admin.from('leases').select('id', { count: 'exact', head: true }).then(r => r.count || 0),
      admin.from('disputes').select('id', { count: 'exact', head: true }).in('status', ['OPEN', 'IN_REVIEW']).then(r => r.count || 0),
      admin.from('users').select('role').then(r => {
        const grouped: Record<string, number> = {}
        for (const u of (r.data || [])) {
          grouped[u.role] = (grouped[u.role] || 0) + 1
        }
        return grouped
      }),
      admin.from('users')
        .select('id, first_name, last_name, phone, email, role, is_active, created_at')
        .order('created_at', { ascending: false })
        .limit(10)
        .then(r => r.data || []),
      admin.from('properties')
        .select('*, owner:users!properties_owner_id_fkey(first_name, last_name)')
        .order('created_at', { ascending: false })
        .limit(10)
        .then(r => r.data || []),
      admin.from('disputes')
        .select('*, reported_by:users!disputes_reported_by_id_fkey(first_name, last_name), lease:leases(id, property:properties(title))')
        .in('status', ['OPEN', 'IN_REVIEW'])
        .order('created_at', { ascending: false })
        .then(r => r.data || []),
      admin.from('signalements').select('status').then(r => {
        const grouped: Record<string, number> = {}
        for (const s of ((r.data || []) as any[])) {
          grouped[s.status] = (grouped[s.status] || 0) + 1
        }
        return grouped
      }),
      admin.from('audit_logs').select('id', { count: 'exact', head: true }).eq('action', 'LOGIN_FAILED').then(r => r.count || 0),
      admin.from('connection_logs').select('id', { count: 'exact', head: true }).then(r => r.count || 0),
    ])

    const { data: activeLeases } = await admin
      .from('leases')
      .select('monthly_rent')
      .eq('status', 'ACTIVE')

    const totalRevenue = (activeLeases || []).reduce((sum: number, l: any) => sum + l.monthly_rent, 0)

    // Monthly new users (last 6 months)
    const monthlyNewUsers: Array<{ month: string; count: number }> = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString()
      const { count } = await admin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth)
      monthlyNewUsers.push({ month: key, count: count || 0 })
    }

    // Signalements en attente count
    const { count: signalementsPending } = await admin
      .from('signalements')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PENDING')

    const systemHealth = {
      database: 'OK' as const,
      api: 'OK' as const,
      storage: await checkStorageHealth(),
    }

    const errorRate = connectionLogsCount > 0 ? Math.round((failedLogins / connectionLogsCount) * 100) : 0

    const mappedRecentUsers = recentUsers.map((u: any) => ({
      id: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
      phone: u.phone,
      email: u.email,
      role: u.role,
      isActive: u.is_active,
      createdAt: u.created_at,
    }))

    const mappedRecentProperties = recentProperties.map((p: any) => ({
      id: p.id,
      title: p.title,
      owner: p.owner ? { firstName: p.owner.first_name, lastName: p.owner.last_name } : null,
      createdAt: p.created_at,
      images: p.images || [],
    }))

    const mappedDisputes = disputes.map((d: any) => ({
      id: d.id,
      status: d.status,
      reportedBy: d.reported_by ? { firstName: d.reported_by.first_name, lastName: d.reported_by.last_name } : null,
      lease: d.lease ? { property: d.lease.property ? { title: d.lease.property.title } : null } : null,
      createdAt: d.created_at,
    }))

    // ─── Moderation queue (properties pending verification) ─────────────────────
    const { data: pendingModerationData } = await admin
      .from('properties')
      .select('*, owner:users!properties_owner_id_fkey(first_name, last_name)')
      .eq('status', 'PENDING_VERIFICATION')
      .order('created_at', { ascending: false })
      .limit(10)

    const moderationQueue = ((pendingModerationData ?? []) as any[]).map((p: any) => ({
      id: p.id,
      title: p.title,
      type: p.type,
      price: p.price,
      city: p.city,
      commune: p.commune,
      createdAt: p.created_at,
      owner: p.owner ? { firstName: p.owner.first_name, lastName: p.owner.last_name } : null,
    }))

    // ─── Recent system activities (audit logs) ─────────────────────────────────
    const { data: auditLogs } = await admin
      .from('audit_logs')
      .select('id, action, entity, entity_id, user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    const recentSystemActivities = ((auditLogs ?? []) as any[]).map((a: any) => ({
      id: a.id,
      action: a.action,
      entity: a.entity,
      entityId: a.entity_id,
      createdAt: a.created_at,
    }))

    // ─── Property heatmap data (by commune) ────────────────────────────────────
    const { data: propertiesByLocation } = await admin
      .from('properties')
      .select('city, commune, latitude, longitude')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)

    const heatmapData: Array<{ city: string; commune: string | null; lat: number; lng: number; count: number }> = []
    const locationCount = new Map<string, { city: string; commune: string | null; lat: number; lng: number; count: number }>()
    for (const p of ((propertiesByLocation ?? []) as any[])) {
      const key = `${p.latitude},${p.longitude}`
      if (locationCount.has(key)) {
        locationCount.get(key)!.count++
      } else {
        locationCount.set(key, { city: p.city, commune: p.commune, lat: p.latitude, lng: p.longitude, count: 1 })
      }
    }
    for (const [, v] of locationCount) {
      heatmapData.push(v)
    }

    const resp = NextResponse.json({
      stats: {
        totalUsers,
        totalProperties,
        totalLeases,
        totalDisputes,
        totalRevenue,
        usersByRole,
      },
      signalements: {
        byStatus: signalementsByStatus,
        pendingCount: signalementsPending || 0,
      },
      monthlyNewUsers,
      systemHealth,
      errorRate,
      failedLogins,
      recentUsers: mappedRecentUsers,
      recentProperties: mappedRecentProperties,
      disputes: mappedDisputes,
      moderationQueue,
      recentSystemActivities,
      heatmapData,
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Admin dashboard error:', error)
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
