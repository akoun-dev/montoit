import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/session'

// GET /api/applications — List rental files (applications/candidatures) for current tenant
// Focus on the status tracking view with property info
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } })
    if (!user || user.role !== 'LOCATAIRE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))

    const where: Record<string, unknown> = { tenantId: userId }
    if (status) {
      where.status = status
    }

    const [applications, total] = await Promise.all([
      db.rentalFile.findMany({
        where,
        include: {
          documents: {
            select: {
              id: true,
              type: true,
              name: true,
              status: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
          leases: {
            select: {
              id: true,
              status: true,
              startDate: true,
              endDate: true,
              monthlyRent: true,
              property: {
                select: {
                  id: true,
                  title: true,
                  address: true,
                  city: true,
                  type: true,
                  price: true,
                  currency: true,
                  images: {
                    orderBy: { order: 'asc' },
                    take: 1,
                    select: { url: true },
                  },
                  owner: {
                    select: { id: true, firstName: true, lastName: true },
                  },
                },
              },
            },
          },
          reviewedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.rentalFile.count({ where }),
    ])

    // Enrich each application with a computed status timeline
    const enrichedApplications = applications.map((app) => {
      // Determine status progression
      const statusTimeline = getStatusTimeline(app.status)

      // Get the property info from the first lease if available
      const linkedProperty = app.leases.length > 0 ? app.leases[0].property : null

      // Document validation progress
      const totalDocs = app.documents.length
      const validatedDocs = app.documents.filter((d) => d.status === 'VALIDATED').length
      const rejectedDocs = app.documents.filter((d) => d.status === 'REJECTED').length

      return {
        id: app.id,
        status: app.status,
        monthlyIncome: app.monthlyIncome,
        employer: app.employer,
        employmentType: app.employmentType,
        guarantorName: app.guarantorName,
        guarantorPhone: app.guarantorPhone,
        guarantorRelation: app.guarantorRelation,
        rejectionReason: app.rejectionReason,
        tcComment: app.tcComment,
        reviewedAt: app.reviewedAt,
        validUntil: app.validUntil,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        // Computed fields
        statusTimeline,
        linkedProperty,
        documentProgress: {
          total: totalDocs,
          validated: validatedDocs,
          rejected: rejectedDocs,
          pending: totalDocs - validatedDocs - rejectedDocs,
        },
        reviewedBy: app.reviewedBy,
        documents: app.documents,
        leases: app.leases,
      }
    })

    // Stats
    const statusCounts = await db.rentalFile.groupBy({
      by: ['status'],
      where: { tenantId: userId },
      _count: { status: true },
    })

    const stats = Object.fromEntries(
      statusCounts.map((s) => [s.status, s._count.status])
    )

    return NextResponse.json({
      data: enrichedApplications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats,
    })
  } catch (error) {
    console.error('Applications GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * Returns a timeline of statuses for a rental file application.
 * Each step has: status, label, completed (boolean), active (boolean)
 */
function getStatusTimeline(currentStatus: string) {
  const steps = [
    { status: 'DRAFT', label: 'Brouillon' },
    { status: 'SUBMITTED', label: 'Soumis' },
    { status: 'TC_REVIEW', label: 'Examen TC' },
    { status: 'VALIDATED', label: 'Validé' },
  ]

  const statusOrder = ['DRAFT', 'SUBMITTED', 'TC_REVIEW', 'VALIDATED']
  const currentIndex = statusOrder.indexOf(currentStatus)
  const isRejected = currentStatus === 'REJECTED'
  const isExpired = currentStatus === 'EXPIRED'

  return steps.map((step, index) => ({
    ...step,
    completed: !isRejected && !isExpired && index < currentIndex,
    active: !isRejected && !isExpired && index === currentIndex,
  })).concat(
    isRejected
      ? [{ status: 'REJECTED', label: 'Rejeté', completed: false, active: true }]
      : isExpired
        ? [{ status: 'EXPIRED', label: 'Expiré', completed: false, active: true }]
        : []
  )
}
