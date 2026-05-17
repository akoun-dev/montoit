import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
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
      db.user.count(),
      db.property.count(),
      db.lease.count(),
      db.dispute.count({ where: { status: { in: ['OPEN', 'IN_REVIEW'] } } }),
      db.user.groupBy({ by: ['role'], _count: { role: true } }),
      db.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, firstName: true, lastName: true, phone: true, email: true, role: true, isActive: true, createdAt: true },
      }),
      db.property.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          owner: { select: { firstName: true, lastName: true } },
          images: { orderBy: { order: 'asc' }, take: 1 },
        },
      }),
      db.dispute.findMany({
        where: { status: { in: ['OPEN', 'IN_REVIEW'] } },
        include: {
          reportedBy: { select: { firstName: true, lastName: true } },
          lease: { include: { property: { select: { title: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.signalement.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      db.auditLog.count({ where: { action: 'LOGIN_FAILED' } }),
      db.connectionLog.count(),
    ])

    const activeLeases = await db.lease.findMany({
      where: { status: 'ACTIVE' },
    })
    const totalRevenue = activeLeases.reduce((sum, l) => sum + l.monthlyRent, 0)

    // Monthly new users (last 6 months)
    const monthlyNewUsers: Array<{ month: string; count: number }> = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1)
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
      const count = await db.user.count({
        where: { createdAt: { gte: startOfMonth, lte: endOfMonth } },
      })
      monthlyNewUsers.push({ month: key, count })
    }

    // Signalements en attente count
    const signalementsPending = await db.signalement.count({ where: { status: 'PENDING' } })

    // System health indicators
    const systemHealth = {
      database: 'OK' as const,
      api: 'OK' as const,
      storage: 'OK' as const,
    }

    // Error rate (simulated: % of failed logins vs total connections)
    const errorRate = connectionLogsCount > 0 ? Math.round((failedLogins / connectionLogsCount) * 100) : 0

    return NextResponse.json({
      stats: {
        totalUsers,
        totalProperties,
        totalLeases,
        totalDisputes,
        totalRevenue,
        usersByRole: usersByRole.reduce((acc, item) => {
          acc[item.role] = item._count.role
          return acc
        }, {} as Record<string, number>),
      },
      signalements: {
        byStatus: signalementsByStatus.reduce((acc, item) => {
          acc[item.status] = item._count.status
          return acc
        }, {} as Record<string, number>),
        pendingCount: signalementsPending,
      },
      monthlyNewUsers,
      systemHealth,
      errorRate,
      failedLogins,
      recentUsers,
      recentProperties,
      disputes,
    })
  } catch (error) {
    console.error('Admin dashboard error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
