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

    if (effectiveRole !== 'LOCATAIRE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const [rentalFiles, visitRequests, activeLeases, conversations] = await Promise.all([
      db.rentalFile.findMany({
        where: { tenantId: userId },
        include: {
          documents: true,
          leases: { where: { status: 'ACTIVE' } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      db.visitRequest.findMany({
        where: { tenantId: userId },
        include: {
          property: {
            include: { images: { orderBy: { order: 'asc' }, take: 1 } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.lease.findMany({
        where: { tenantId: userId, status: 'ACTIVE' },
        include: {
          property: { include: { images: { orderBy: { order: 'asc' }, take: 1 } } },
          owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
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
      }),
      db.conversation.findMany({
        where: {
          OR: [{ participant1Id: userId }, { participant2Id: userId }],
        },
        include: {
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          participant1: { select: { id: true, firstName: true, lastName: true } },
          participant2: { select: { id: true, firstName: true, lastName: true } },
          property: { select: { title: true } },
        },
        orderBy: { lastMessageAt: 'desc' },
      }),
    ])

    const unreadMessages = await db.message.count({
      where: {
        isRead: false,
        senderId: { not: userId },
        conversation: {
          OR: [{ participant1Id: userId }, { participant2Id: userId }],
        },
      },
    })

    // ─── Payment stats for active leases ──────────────────────────────────────
    const activeLeaseIds = activeLeases.map((l) => l.id)

    const [latePaymentsCount, totalPaidResult, nextPendingPayments] = activeLeaseIds.length > 0
      ? await Promise.all([
          // Late payments count across all active leases
          db.payment.count({
            where: {
              leaseId: { in: activeLeaseIds },
              status: 'LATE',
            },
          }),
          // Total paid amount across all active leases
          db.payment.aggregate({
            where: {
              leaseId: { in: activeLeaseIds },
              status: 'PAID',
            },
            _sum: { amount: true },
          }),
          // Next pending payment (earliest dueDate)
          db.payment.findFirst({
            where: {
              leaseId: { in: activeLeaseIds },
              status: { in: ['PENDING', 'LATE'] },
            },
            orderBy: { dueDate: 'asc' },
            select: {
              id: true,
              amount: true,
              dueDate: true,
              status: true,
              leaseId: true,
            },
          }),
        ])
      : [0, { _sum: { amount: 0 } }, null]

    // Determine payment status for each active lease
    const activeLeasesWithPaymentStatus = activeLeases.map((lease) => {
      const leasePayments = lease.payments || []
      const hasLate = leasePayments.some((p) => p.status === 'LATE')
      const hasPending = leasePayments.some((p) => p.status === 'PENDING')
      const pendingPayments = leasePayments.filter((p) => p.status === 'PENDING')
      const latePayments = leasePayments.filter((p) => p.status === 'LATE')
      const paidPayments = leasePayments.filter((p) => p.status === 'PAID')

      // Next pending/late payment for this lease
      const nextPayment = pendingPayments.length > 0
        ? pendingPayments[0]
        : latePayments.length > 0
          ? latePayments[0]
          : null

      let paymentStatus: 'up_to_date' | 'late' | 'pending' = 'up_to_date'
      if (hasLate) paymentStatus = 'late'
      else if (hasPending) paymentStatus = 'pending'

      return {
        ...lease,
        paymentStatus,
        nextPayment: nextPayment ? {
          id: nextPayment.id,
          amount: nextPayment.amount,
          dueDate: nextPayment.dueDate,
          status: nextPayment.status,
        } : null,
        latePaymentsCount: latePayments.length,
        totalPaid: paidPayments.reduce((sum, p) => sum + p.amount, 0),
      }
    })

    return NextResponse.json({
      rentalFiles,
      visitRequests,
      activeLeases: activeLeasesWithPaymentStatus,
      conversations,
      stats: {
        totalRentalFiles: rentalFiles.length,
        activeLeases: activeLeases.length,
        pendingVisits: visitRequests.filter((v) => v.status === 'PENDING').length,
        unreadMessages,
        latePaymentsCount,
        totalPaid: totalPaidResult._sum.amount || 0,
        nextPayment: nextPendingPayments ? {
          id: nextPendingPayments.id,
          amount: nextPendingPayments.amount,
          dueDate: nextPendingPayments.dueDate,
          status: nextPendingPayments.status,
          leaseId: nextPendingPayments.leaseId,
        } : null,
      },
    })
  } catch (error) {
    console.error('Locataire dashboard error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
