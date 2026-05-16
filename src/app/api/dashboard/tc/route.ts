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
    if (!user || user.role !== 'TIERS_CONFIANCE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const [pendingRentalFiles, pendingOwnershipDocs, slas] = await Promise.all([
      db.rentalFile.findMany({
        where: { status: { in: ['SUBMITTED', 'TC_REVIEW'] } },
        include: {
          tenant: { select: { firstName: true, lastName: true, phone: true } },
          documents: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      db.ownershipDocument.findMany({
        where: { status: 'PENDING' },
        include: {
          owner: { select: { firstName: true, lastName: true, phone: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      db.validationSLA.findMany({
        where: { reviewerId: userId },
        orderBy: { deadlineAt: 'asc' },
        take: 50,
      }),
    ])

    const totalReviewed = await db.rentalFile.count({
      where: { reviewedById: userId, status: { in: ['VALIDATED', 'REJECTED'] } },
    })

    const overdueSlas = slas.filter((s) => s.isOverdue && !s.completedAt)

    return NextResponse.json({
      pendingRentalFiles,
      pendingOwnershipDocs,
      slas,
      stats: {
        pendingRentalFiles: pendingRentalFiles.length,
        pendingOwnershipDocs: pendingOwnershipDocs.length,
        totalReviewed,
        overdueSlas: overdueSlas.length,
        slaCompliance: totalReviewed > 0 ? Math.round(((totalReviewed - overdueSlas.length) / totalReviewed) * 100) : 100,
      },
    })
  } catch (error) {
    console.error('TC dashboard error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
