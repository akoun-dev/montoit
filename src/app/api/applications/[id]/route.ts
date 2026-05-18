import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// GET /api/applications/[id] — Get a single application (rental file) detail
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'LOCATAIRE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { id } = await params
    const application = await db.rentalFile.findFirst({
      where: { id, tenantId: userId },
      include: {
        documents: {
          select: {
            id: true,
            type: true,
            name: true,
            status: true,
            tcComment: true,
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
    })

    if (!application) {
      return NextResponse.json({ error: 'Candidature introuvable' }, { status: 404 })
    }

    // Compute status timeline
    const steps = [
      { status: 'DRAFT', label: 'Brouillon' },
      { status: 'SUBMITTED', label: 'Soumis' },
      { status: 'TC_REVIEW', label: 'Examen TC' },
      { status: 'VALIDATED', label: 'Validé' },
    ]

    const statusOrder = ['DRAFT', 'SUBMITTED', 'TC_REVIEW', 'VALIDATED']
    const currentIndex = statusOrder.indexOf(application.status)
    const isRejected = application.status === 'REJECTED'
    const isExpired = application.status === 'EXPIRED'

    const statusTimeline = steps.map((step, index) => ({
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

    const linkedProperty = application.leases.length > 0 ? application.leases[0].property : null
    const totalDocs = application.documents.length
    const validatedDocs = application.documents.filter(d => d.status === 'VALIDATED').length
    const rejectedDocs = application.documents.filter(d => d.status === 'REJECTED').length

    return NextResponse.json({
      data: {
        id: application.id,
        status: application.status,
        monthlyIncome: application.monthlyIncome,
        employer: application.employer,
        employmentType: application.employmentType,
        guarantorName: application.guarantorName,
        guarantorPhone: application.guarantorPhone,
        guarantorRelation: application.guarantorRelation,
        rejectionReason: application.rejectionReason,
        tcComment: application.tcComment,
        reviewedAt: application.reviewedAt,
        validUntil: application.validUntil,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
        statusTimeline,
        linkedProperty,
        documentProgress: {
          total: totalDocs,
          validated: validatedDocs,
          rejected: rejectedDocs,
          pending: totalDocs - validatedDocs - rejectedDocs,
        },
        reviewedBy: application.reviewedBy,
        documents: application.documents,
        leases: application.leases,
      },
    })
  } catch (error) {
    console.error('Application detail GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
