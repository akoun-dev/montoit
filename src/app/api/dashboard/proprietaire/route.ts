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
    const effectiveRole = user?.activeRole || user?.role
    if (!user || (effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE')) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const [properties, visitRequests, rentalFiles, activeLeases] = await Promise.all([
      db.property.findMany({
        where: { ownerId: userId },
        include: { images: { orderBy: { order: 'asc' }, take: 1 } },
        orderBy: { createdAt: 'desc' },
      }),
      db.visitRequest.findMany({
        where: {
          property: { ownerId: userId },
        },
        include: {
          tenant: { select: { firstName: true, lastName: true, phone: true } },
          property: { select: { title: true, city: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.rentalFile.findMany({
        where: { status: { in: ['SUBMITTED', 'TC_REVIEW', 'VALIDATED'] } },
        include: {
          tenant: { select: { firstName: true, lastName: true, phone: true } },
          documents: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
      db.lease.findMany({
        where: { ownerId: userId },
        include: {
          tenant: { select: { firstName: true, lastName: true } },
          property: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return NextResponse.json({
      properties,
      visitRequests,
      rentalFiles,
      activeLeases,
      stats: {
        totalProperties: properties.length,
        activeProperties: properties.filter((p) => p.status === 'ACTIVE').length,
        pendingVisits: visitRequests.filter((v) => v.status === 'PENDING').length,
        activeLeases: activeLeases.filter((l) => l.status === 'ACTIVE').length,
        totalRevenue: activeLeases
          .filter((l) => l.status === 'ACTIVE')
          .reduce((sum, l) => sum + l.monthlyRent, 0),
      },
    })
  } catch (error) {
    console.error('Proprietaire dashboard error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
