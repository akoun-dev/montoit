import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/session'

// GET /api/tenants/[id] — Get detailed info about a specific tenant (for owner view)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { id: userId }, select: { role: true, activeRole: true } })
    const effectiveRole = user?.activeRole || user?.role
    if (!user || (effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE')) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { id: tenantId } = await params

    // Get tenant info
    const tenant = await db.user.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        gender: true,
        city: true,
        address: true,
        neofaceVerified: true,
        oneciVerified: true,
        createdAt: true,
      },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Locataire introuvable' }, { status: 404 })
    }

    // Verify this owner has leases with this tenant
    const ownerLeases = await db.lease.findMany({
      where: {
        ownerId: userId,
        tenantId,
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            type: true,
            address: true,
            city: true,
            commune: true,
            area: true,
            bedrooms: true,
            images: { orderBy: { order: 'asc' }, take: 1, select: { url: true } },
          },
        },
        payments: {
          orderBy: { dueDate: 'desc' },
        },
        rentalFile: {
          select: {
            id: true,
            status: true,
            monthlyIncome: true,
            employer: true,
            employmentType: true,
            guarantorName: true,
            guarantorPhone: true,
            guarantorRelation: true,
            reviewedAt: true,
            documents: {
              select: {
                id: true,
                type: true,
                name: true,
                status: true,
                tcComment: true,
              },
            },
          },
        },
        maintenanceRequests: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        ratings: {
          select: {
            id: true,
            score: true,
            comment: true,
            createdAt: true,
            fromUser: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (ownerLeases.length === 0) {
      return NextResponse.json({ error: 'Ce locataire ne fait pas partie de vos locataires' }, { status: 403 })
    }

    // Compute payment stats across all leases
    const allPayments = ownerLeases.flatMap(l => l.payments)
    const totalPaid = allPayments
      .filter(p => p.status === 'PAID')
      .reduce((sum, p) => sum + p.amount, 0)
    const totalPending = allPayments
      .filter(p => p.status === 'PENDING')
      .reduce((sum, p) => sum + p.amount, 0)
    const totalLate = allPayments
      .filter(p => p.status === 'LATE')
      .reduce((sum, p) => sum + p.amount, 0)
    const paidCount = allPayments.filter(p => p.status === 'PAID').length
    const lateCount = allPayments.filter(p => p.status === 'LATE').length
    const pendingCount = allPayments.filter(p => p.status === 'PENDING').length

    // Payment regularity score (percentage of on-time payments)
    const totalCompleted = paidCount + lateCount
    const paymentScore = totalCompleted > 0 ? Math.round((paidCount / totalCompleted) * 100) : 100

    const formattedLeases = ownerLeases.map(l => ({
      id: l.id,
      status: l.status,
      startDate: l.startDate.toISOString(),
      endDate: l.endDate.toISOString(),
      monthlyRent: l.monthlyRent,
      charges: l.charges,
      deposit: l.deposit,
      specialConditions: l.specialConditions,
      ownerSignedAt: l.ownerSignedAt?.toISOString() || null,
      tenantSignedAt: l.tenantSignedAt?.toISOString() || null,
      property: l.property,
      payments: l.payments.map(p => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        dueDate: p.dueDate.toISOString(),
        paidAt: p.paidAt?.toISOString() || null,
        reference: p.reference,
        createdAt: p.createdAt.toISOString(),
      })),
      rentalFile: l.rentalFile ? {
        ...l.rentalFile,
        reviewedAt: l.rentalFile.reviewedAt?.toISOString() || null,
      } : null,
      maintenanceRequests: l.maintenanceRequests.map(m => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      })),
      ratings: l.ratings.map(r => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
    }))

    return NextResponse.json({
      data: {
        tenant: {
          ...tenant,
          createdAt: tenant.createdAt.toISOString(),
        },
        leases: formattedLeases,
        paymentStats: {
          totalPaid,
          totalPending,
          totalLate,
          paidCount,
          lateCount,
          pendingCount,
          paymentScore,
          totalPayments: allPayments.length,
        },
      },
    })
  } catch (error) {
    console.error('Tenant detail GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
