import { NextRequest, NextResponse } from 'next/server'
import { Prisma, PaymentStatus, PaymentMethod } from '@prisma/client'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// GET /api/payments — List payments for current tenant or owner with stats
export async function GET(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'LOCATAIRE' && effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const statusParam = searchParams.get('status') || undefined
    const leaseId = searchParams.get('leaseId') || undefined
    const methodParam = searchParams.get('method') || undefined

    // Build where clause with proper Prisma typing
    // LOCATAIRE sees their own payments
    // PROPRIETAIRE sees payments for their properties (owned directly)
    // AGENCE sees payments for properties under their mandats
    let where: Prisma.PaymentWhereInput
    if (effectiveRole === 'PROPRIETAIRE') {
      where = { lease: { ownerId: userId } }
    } else if (effectiveRole === 'AGENCE') {
      // Agence sees payments for properties where they have active mandats
      where = {
        lease: {
          property: {
            mandats: {
              some: { agencyId: userId, status: 'ACTIVE' }
            }
          }
        }
      }
    } else {
      where = { tenantId: userId }
    }

    // Add optional filters with proper enum casting
    if (statusParam) {
      where.status = statusParam as PaymentStatus
    }
    if (leaseId) {
      where.leaseId = leaseId
    }
    if (methodParam) {
      where.method = methodParam as PaymentMethod
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
    const allPaymentsWhere: Prisma.PaymentWhereInput = effectiveRole === 'PROPRIETAIRE'
      ? { lease: { ownerId: userId } }
      : effectiveRole === 'AGENCE'
        ? { lease: { property: { mandats: { some: { agencyId: userId, status: 'ACTIVE' } } } } }
        : { tenantId: userId }
    const allPayments = await db.payment.findMany({
      where: allPaymentsWhere,
      select: {
        amount: true,
        status: true,
        dueDate: true,
        paidAt: true,
        method: true,
      },
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

    // Payment method distribution
    const methodDistribution: Record<string, number> = {}
    allPayments
      .filter((p) => p.method)
      .forEach((p) => {
        const m = p.method as string
        methodDistribution[m] = (methodDistribution[m] || 0) + 1
      })

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
        processingCount: allPayments.filter((p) => p.status === 'PROCESSING').length,
        methodDistribution,
      },
    })
  } catch (error) {
    console.error('Payments GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
