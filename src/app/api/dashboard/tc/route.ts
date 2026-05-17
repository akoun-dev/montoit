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

    if (effectiveRole !== 'TIERS_CONFIANCE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Ownership doc breakdown by type (for owner validations)
    const ownershipDocBreakdown = await db.ownershipDocument.groupBy({
      by: ['type'],
      where: { status: 'PENDING' },
      _count: { type: true },
    })

    const docBreakdownMap = Object.fromEntries(
      ownershipDocBreakdown.map((d) => [d.type, d._count.type])
    )

    const [
      pendingRentalFiles,
      pendingOwnershipDocs,
      slas,
      pendingProperties,
      pendingAgencyDocs,
      pendingOwnerDocs,
      submittedRentalCount,
      tcReviewRentalCount,
      recentActivities,
    ] = await Promise.all([
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
      db.property.count({
        where: { status: 'PENDING_VERIFICATION' },
      }),
      // Agency-specific docs: AGREMENT or RCCM with PENDING status
      db.ownershipDocument.count({
        where: {
          status: 'PENDING',
          type: { in: ['AGREMENT', 'RCCM'] },
        },
      }),
      // Owner-specific docs: TITRE_FONCIER, ACTE_NOTARIE, ATTESTATION_PROPRIETE with PENDING status
      db.ownershipDocument.count({
        where: {
          status: 'PENDING',
          type: { in: ['TITRE_FONCIER', 'ACTE_NOTARIE', 'ATTESTATION_PROPRIETE'] },
        },
      }),
      // Rental files broken down by status: SUBMITTED
      db.rentalFile.count({
        where: { status: 'SUBMITTED' },
      }),
      // Rental files broken down by status: TC_REVIEW
      db.rentalFile.count({
        where: { status: 'TC_REVIEW' },
      }),
      // Recent activities: 5 most recent audit logs for this TC user
      db.auditLog.findMany({
        where: { userId },
        select: {
          entity: true,
          action: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
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
        pendingProperties,
        totalReviewed,
        overdueSlas: overdueSlas.length,
        slaCompliance: totalReviewed > 0 ? Math.round(((totalReviewed - overdueSlas.length) / totalReviewed) * 100) : 100,
        // New: agency-specific document counts
        pendingAgencyDocs,
        pendingOwnerDocs,
        // New: rental file breakdown by status
        rentalFilesByStatus: {
          SUBMITTED: submittedRentalCount,
          TC_REVIEW: tcReviewRentalCount,
        },
        // Ownership doc breakdown by type
        pendingOwnerDocsByType: {
          TITRE_FONCIER: docBreakdownMap['TITRE_FONCIER'] || 0,
          ACTE_NOTARIE: docBreakdownMap['ACTE_NOTARIE'] || 0,
          ATTESTATION_PROPRIETE: docBreakdownMap['ATTESTATION_PROPRIETE'] || 0,
        },
        pendingAgencyDocsByType: {
          AGREMENT: docBreakdownMap['AGREMENT'] || 0,
          RCCM: docBreakdownMap['RCCM'] || 0,
        },
      },
      // New: recent audit log activities for this TC user
      recentActivities,
    })
  } catch (error) {
    console.error('TC dashboard error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
