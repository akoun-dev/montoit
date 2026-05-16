import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/session'

// GET /api/payments — List payments for current tenant with stats
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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const status = searchParams.get('status') || undefined
    const leaseId = searchParams.get('leaseId') || undefined

    // Build where clause — only payments for this tenant
    const where: Record<string, unknown> = { tenantId: userId }
    if (status) {
      where.status = status
    }
    if (leaseId) {
      where.leaseId = leaseId
    }

    const [payments, total] = await Promise.all([
      db.payment.findMany({
        where,
        include: {
          lease: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
              monthlyRent: true,
              property: {
                select: {
                  id: true,
                  title: true,
                  address: true,
                  city: true,
                  images: {
                    orderBy: { order: 'asc' },
                    take: 1,
                    select: { url: true },
                  },
                },
              },
              owner: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
        orderBy: { dueDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.payment.count({ where }),
    ])

    // Compute stats
    const allPayments = await db.payment.findMany({
      where: { tenantId: userId },
      select: { amount: true, status: true, dueDate: true, paidAt: true },
    })

    const totalPaid = allPayments
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + p.amount, 0)

    const latePaymentsCount = allPayments.filter((p) => p.status === 'LATE').length

    // Next payment due: earliest PENDING payment
    const pendingPayments = allPayments
      .filter((p) => p.status === 'PENDING')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

    const nextPaymentDue = pendingPayments.length > 0
      ? {
          amount: pendingPayments[0].amount,
          dueDate: pendingPayments[0].dueDate,
        }
      : null

    return NextResponse.json({
      data: payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalPaid,
        latePaymentsCount,
        nextPaymentDue,
        totalPayments: allPayments.length,
        paidCount: allPayments.filter((p) => p.status === 'PAID').length,
        pendingCount: allPayments.filter((p) => p.status === 'PENDING').length,
      },
    })
  } catch (error) {
    console.error('Payments GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
