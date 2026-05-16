import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const [
      totalUsers,
      totalProperties,
      totalLeases,
      totalDisputes,
      usersByRole,
      recentUsers,
      recentProperties,
      disputes,
    ] = await Promise.all([
      db.user.count(),
      db.property.count(),
      db.lease.count(),
      db.dispute.count({ where: { status: { in: ['OPEN', 'IN_REVIEW'] } } }),
      db.user.groupBy({ by: ['role'], _count: { role: true } }),
      db.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, firstName: true, lastName: true, phone: true, role: true, isActive: true, createdAt: true },
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
    ])

    const activeLeases = await db.lease.findMany({
      where: { status: 'ACTIVE' },
    })
    const totalRevenue = activeLeases.reduce((sum, l) => sum + l.monthlyRent, 0)

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
      recentUsers,
      recentProperties,
      disputes,
    })
  } catch (error) {
    console.error('Admin dashboard error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
