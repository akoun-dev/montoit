import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// GET /api/owner/analytics — Return analytics for the owner
export async function GET(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'PROPRIETAIRE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // ─── Fetch all data in parallel ──────────────────────────────────────────
    const [
      properties,
      activeLeases,
      allPayments,
      visitRequests,
      allLeases,
    ] = await Promise.all([
      // All properties owned by this owner
      db.property.findMany({
        where: { ownerId: userId },
        select: {
          id: true,
          title: true,
          city: true,
          price: true,
          status: true,
          rentalStatus: true,
          createdAt: true,
        },
      }),
      // Active leases for this owner
      db.lease.findMany({
        where: { ownerId: userId, status: 'ACTIVE' },
        include: {
          property: { select: { id: true, title: true, city: true, price: true } },
          tenant: { select: { id: true, firstName: true, lastName: true } },
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
      // All payments across all leases of this owner (for revenue calculations)
      db.payment.findMany({
        where: {
          lease: { ownerId: userId },
        },
        select: {
          id: true,
          amount: true,
          status: true,
          dueDate: true,
          paidAt: true,
          leaseId: true,
          lease: {
            select: {
              propertyId: true,
              property: { select: { id: true, title: true } },
            },
          },
        },
        orderBy: { dueDate: 'desc' },
      }),
      // Visit requests count per property (only from TC-verified tenants)
      db.visitRequest.findMany({
        where: {
          property: { ownerId: userId },
          tenant: { rentalFiles: { some: { status: 'VALIDATED' } } },
        },
        select: { propertyId: true, status: true, createdAt: true },
      }),
      // All leases (including terminated) for duration calculation
      db.lease.findMany({
        where: { ownerId: userId },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          status: true,
          propertyId: true,
        },
      }),
    ])

    // ─── Occupancy Rate ─────────────────────────────────────────────────────
    const totalProperties = properties.length
    const rentedProperties = properties.filter((p) => p.rentalStatus === 'loue').length
    const occupancyRate = totalProperties > 0 ? Math.round((rentedProperties / totalProperties) * 100) : 0

    // ─── Monthly Revenue for Last 12 Months ─────────────────────────────────
    const now = new Date()
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)

    const monthlyRevenue: { month: string; revenue: number; paid: number; pending: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)
      const monthLabel = monthStart.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' })

      const monthPayments = allPayments.filter((p) => {
        const dueDate = new Date(p.dueDate)
        return dueDate >= monthStart && dueDate <= monthEnd
      })

      const paid = monthPayments
        .filter((p) => p.status === 'PAID')
        .reduce((sum, p) => sum + p.amount, 0)
      const pending = monthPayments
        .filter((p) => p.status === 'PENDING' || p.status === 'LATE' || p.status === 'PARTIAL')
        .reduce((sum, p) => sum + p.amount, 0)

      monthlyRevenue.push({
        month: monthLabel,
        revenue: paid + pending,
        paid,
        pending,
      })
    }

    // ─── Average Lease Duration ─────────────────────────────────────────────
    const completedLeases = allLeases.filter(
      (l) => l.status === 'TERMINATED' || l.status === 'EXPIRED'
    )
    let averageLeaseDurationMonths = 0
    if (completedLeases.length > 0) {
      const totalDurationDays = completedLeases.reduce((sum, l) => {
        const start = new Date(l.startDate)
        const end = new Date(l.endDate)
        return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      }, 0)
      averageLeaseDurationMonths = Math.round((totalDurationDays / completedLeases.length / 30.44) * 10) / 10
    }

    // ─── Per-Property Performance ───────────────────────────────────────────
    const visitCountByProperty: Record<string, number> = {}
    for (const vr of visitRequests) {
      visitCountByProperty[vr.propertyId] = (visitCountByProperty[vr.propertyId] || 0) + 1
    }

    const perPropertyPerformance = properties.map((property) => {
      const propertyLeases = activeLeases.filter((l) => l.propertyId === property.id)
      const propertyPayments = allPayments.filter((p) => p.lease.propertyId === property.id)

      const revenue = propertyPayments
        .filter((p) => p.status === 'PAID')
        .reduce((sum, p) => sum + p.amount, 0)

      const isOccupied = propertyLeases.length > 0

      return {
        propertyId: property.id,
        propertyTitle: property.title,
        city: property.city,
        revenue,
        occupancy: isOccupied ? 100 : 0,
        visitCount: visitCountByProperty[property.id] || 0,
        activeLeases: propertyLeases.length,
        monthlyRent: propertyLeases.reduce((sum, l) => sum + l.monthlyRent, 0),
      }
    })

    // ─── Late Payments Trend (last 6 months) ───────────────────────────────
    const latePaymentsTrend: { month: string; count: number; amount: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)
      const monthLabel = monthStart.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' })

      const lateThisMonth = allPayments.filter((p) => {
        const dueDate = new Date(p.dueDate)
        return (
          p.status === 'LATE' &&
          dueDate >= monthStart &&
          dueDate <= monthEnd
        )
      })

      latePaymentsTrend.push({
        month: monthLabel,
        count: lateThisMonth.length,
        amount: lateThisMonth.reduce((sum, p) => sum + p.amount, 0),
      })
    }

    // ─── Totals ─────────────────────────────────────────────────────────────
    const totalRevenue = allPayments
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + p.amount, 0)

    const totalPaid = totalRevenue

    const totalPending = allPayments
      .filter((p) => p.status === 'PENDING' || p.status === 'LATE' || p.status === 'PARTIAL')
      .reduce((sum, p) => sum + p.amount, 0)

    const latePaymentsCount = allPayments.filter((p) => p.status === 'LATE').length

    return NextResponse.json({
      occupancyRate,
      monthlyRevenue,
      averageLeaseDurationMonths,
      perPropertyPerformance,
      latePaymentsTrend,
      totals: {
        totalRevenue,
        totalPaid,
        totalPending,
        latePaymentsCount,
        totalProperties,
        rentedProperties,
        activeLeases: activeLeases.length,
      },
    })
  } catch (error) {
    console.error('Owner analytics error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
