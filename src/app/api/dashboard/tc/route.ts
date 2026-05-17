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

    // Ownership doc breakdown by type
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
      auditBreakdown,
      overdueSlasList,
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
      db.ownershipDocument.count({
        where: { status: 'PENDING', type: { in: ['AGREMENT', 'RCCM'] } },
      }),
      db.ownershipDocument.count({
        where: { status: 'PENDING', type: { in: ['TITRE_FONCIER', 'ACTE_NOTARIE', 'ATTESTATION_PROPRIETE'] } },
      }),
      db.rentalFile.count({ where: { status: 'SUBMITTED' } }),
      db.rentalFile.count({ where: { status: 'TC_REVIEW' } }),
      db.auditLog.findMany({
        where: { userId },
        select: { entity: true, action: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      // Audit breakdown: validated, rejected, info_requested counts
      db.auditLog.groupBy({
        by: ['action'],
        where: {
          userId,
          action: { in: ['RENTAL_FILE_APPROVED', 'RENTAL_FILE_REJECTED', 'RENTAL_FILE_INFO_REQUESTED', 'RENTAL_FILE_PRIORITY_CHANGED'] },
        },
        _count: { action: true },
      }),
      // Overdue SLA list with details
      db.validationSLA.findMany({
        where: {
          reviewerId: userId,
          isOverdue: true,
          completedAt: null,
        },
        include: {
          reviewer: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { deadlineAt: 'asc' },
        take: 20,
      }),
    ])

    const totalReviewed = await db.rentalFile.count({
      where: { reviewedById: userId, status: { in: ['VALIDATED', 'REJECTED'] } },
    })

    const overdueSlas = slas.filter((s) => s.isOverdue && !s.completedAt)

    // Compute audit breakdown
    const auditMap = Object.fromEntries(auditBreakdown.map((a) => [a.action, a._count.action]))
    const validatedCount = auditMap['RENTAL_FILE_APPROVED'] || 0
    const rejectedCount = auditMap['RENTAL_FILE_REJECTED'] || 0
    const infoRequestedCount = auditMap['RENTAL_FILE_INFO_REQUESTED'] || 0

    // Enrich overdue SLAs with days overdue
    const now = new Date()
    const overdueListWithDetails = overdueSlasList.map((sla) => {
      const deadline = new Date(sla.deadlineAt)
      const diffMs = now.getTime() - deadline.getTime()
      const daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
      return {
        id: sla.id,
        entityType: sla.entityType,
        entityId: sla.entityId,
        submittedAt: sla.submittedAt,
        deadlineAt: sla.deadlineAt,
        daysOverdue,
      }
    })

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
        pendingAgencyDocs,
        pendingOwnerDocs,
        rentalFilesByStatus: {
          SUBMITTED: submittedRentalCount,
          TC_REVIEW: tcReviewRentalCount,
        },
        pendingOwnerDocsByType: {
          TITRE_FONCIER: docBreakdownMap['TITRE_FONCIER'] || 0,
          ACTE_NOTARIE: docBreakdownMap['ACTE_NOTARIE'] || 0,
          ATTESTATION_PROPRIETE: docBreakdownMap['ATTESTATION_PROPRIETE'] || 0,
        },
        pendingAgencyDocsByType: {
          AGREMENT: docBreakdownMap['AGREMENT'] || 0,
          RCCM: docBreakdownMap['RCCM'] || 0,
        },
        // New: audit breakdown
        auditBreakdown: {
          validated: validatedCount,
          rejected: rejectedCount,
          infoRequested: infoRequestedCount,
        },
      },
      recentActivities,
      // New: overdue SLA list with details
      overdueSlasList: overdueListWithDetails,
    })
  } catch (error) {
    console.error('TC dashboard error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
