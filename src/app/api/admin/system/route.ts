import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// GET /api/admin/system — return system stats
export async function GET(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (authResult.effectiveRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
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
      db.user.count(),
      db.property.count(),
      db.lease.count(),
      db.dispute.count(),
      db.signalement.count(),
      db.connectionLog.count(),
      db.auditLog.count({ where: { action: 'LOGIN_FAILED' } }),
    ])

    // Revenue by month (last 6 months)
    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const activeLeases = await db.lease.findMany({
      where: { status: 'ACTIVE' },
      select: { monthlyRent: true, charges: true, createdAt: true },
    })

    const revenueByMonth: Record<string, number> = {}
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      revenueByMonth[key] = 0
    }
    activeLeases.forEach((lease) => {
      const d = new Date(lease.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (revenueByMonth[key] !== undefined) {
        revenueByMonth[key] += lease.monthlyRent + lease.charges
      }
    })

    // Recent connection logs
    const recentConnections = await db.connectionLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    })

    // Recent failed login attempts
    const recentFailedLogins = await db.auditLog.findMany({
      where: { action: 'LOGIN_FAILED' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    })

    // Monthly new users (last 6 months)
    const monthlyNewUsers: Record<string, number> = {}
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1)
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
      const count = await db.user.count({
        where: {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      })
      monthlyNewUsers[key] = count
    }

    return NextResponse.json({
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
        storage: 'OK',
      },
    })
  } catch (error) {
    console.error('Admin system GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
