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

    if (effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE') {
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
          tenant: {
            rentalFiles: {
              some: { status: 'VALIDATED' }
            }
          }
        },
        include: {
          tenant: { select: { firstName: true, lastName: true, phone: true } },
          property: { select: { title: true, city: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.rentalFile.findMany({
        where: {
          status: { in: ['SUBMITTED', 'TC_REVIEW', 'VALIDATED'] },
          leases: {
            some: {
              property: { ownerId: userId },
            },
          },
        },
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
          tenant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              phone: true,
            },
          },
          property: {
            select: {
              title: true,
              city: true,
              address: true,
              images: { orderBy: { order: 'asc' }, take: 1 },
            },
          },
          payments: {
            select: {
              id: true,
              amount: true,
              status: true,
              dueDate: true,
              paidAt: true,
            },
            orderBy: { dueDate: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    // ─── Enhance active leases with payment info ─────────────────────────────
    const activeLeasesEnhanced = activeLeases.map((lease) => {
      const leasePayments = lease.payments || []
      const latePayments = leasePayments.filter((p) => p.status === 'LATE')
      const pendingPayments = leasePayments.filter((p) => p.status === 'PENDING')
      const paidPayments = leasePayments.filter((p) => p.status === 'PAID')

      const hasLate = latePayments.length > 0
      const hasPending = pendingPayments.length > 0

      let paymentStatus: 'up_to_date' | 'late' | 'pending' = 'up_to_date'
      if (hasLate) paymentStatus = 'late'
      else if (hasPending) paymentStatus = 'pending'

      const nextPayment = pendingPayments.length > 0
        ? pendingPayments[0]
        : latePayments.length > 0
          ? latePayments[0]
          : null

      return {
        ...lease,
        paymentStatus,
        latePaymentsCount: latePayments.length,
        totalPaid: paidPayments.reduce((sum, p) => sum + p.amount, 0),
        nextPayment: nextPayment ? {
          id: nextPayment.id,
          amount: nextPayment.amount,
          dueDate: nextPayment.dueDate,
          status: nextPayment.status,
        } : null,
      }
    })

    // ─── Revenue calculations ────────────────────────────────────────────────
    const activeLeaseList = activeLeasesEnhanced.filter((l) => l.status === 'ACTIVE')
    const totalRevenue = activeLeaseList.reduce((sum, l) => sum + l.monthlyRent, 0)
    const totalRevenueFromPayments = activeLeaseList.reduce(
      (sum, l) => sum + (l as { totalPaid: number }).totalPaid,
      0
    )

    // Overall late payments count across all active leases
    const overallLatePayments = activeLeaseList.reduce(
      (sum, l) => sum + (l as { latePaymentsCount: number }).latePaymentsCount,
      0
    )

    return NextResponse.json({
      properties,
      visitRequests,
      rentalFiles,
      activeLeases: activeLeasesEnhanced,
      stats: {
        totalProperties: properties.length,
        activeProperties: properties.filter((p) => p.status === 'ACTIVE').length,
        pendingVisits: visitRequests.filter((v) => v.status === 'PENDING').length,
        activeLeases: activeLeaseList.length,
        totalRevenue,
        totalRevenueFromPayments,
        latePaymentsCount: overallLatePayments,
      },
    })
  } catch (error) {
    console.error('Proprietaire dashboard error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
