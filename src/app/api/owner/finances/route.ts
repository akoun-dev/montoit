import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// GET /api/owner/finances — Return financial data for the owner
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
      allPayments,
      mandats,
      properties,
    ] = await Promise.all([
      // All payments across all leases of this owner
      db.payment.findMany({
        where: { lease: { ownerId: userId } },
        select: {
          id: true,
          amount: true,
          status: true,
          dueDate: true,
          paidAt: true,
          reference: true,
          createdAt: true,
          leaseId: true,
          lease: {
            select: {
              monthlyRent: true,
              propertyId: true,
              property: { select: { id: true, title: true, city: true } },
              tenant: { select: { id: true, firstName: true, lastName: true, phone: true } },
            },
          },
        },
        orderBy: { dueDate: 'desc' },
      }),
      // All mandats for commission tracking
      db.mandat.findMany({
        where: { ownerId: userId },
        select: {
          id: true,
          type: true,
          status: true,
          commissionRate: true,
          commissionType: true,
          fixedCommission: true,
          startDate: true,
          endDate: true,
          propertyId: true,
          property: { select: { id: true, title: true, city: true } },
          agency: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      // Properties for revenue per property
      db.property.findMany({
        where: { ownerId: userId },
        select: {
          id: true,
          title: true,
          city: true,
          price: true,
          rentalStatus: true,
        },
      }),
    ])

    const now = new Date()

    // ─── 1. Monthly Revenue History (last 12 months) ────────────────────────
    const monthlyRevenueHistory: {
      month: string
      revenue: number
      collected: number
      pending: number
      late: number
    }[] = []

    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)
      const monthLabel = monthStart.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' })

      const monthPayments = allPayments.filter((p) => {
        const dueDate = new Date(p.dueDate)
        return dueDate >= monthStart && dueDate <= monthEnd
      })

      const collected = monthPayments
        .filter((p) => p.status === 'PAID')
        .reduce((sum, p) => sum + p.amount, 0)
      const pending = monthPayments
        .filter((p) => p.status === 'PENDING')
        .reduce((sum, p) => sum + p.amount, 0)
      const late = monthPayments
        .filter((p) => p.status === 'LATE')
        .reduce((sum, p) => sum + p.amount, 0)
      const partial = monthPayments
        .filter((p) => p.status === 'PARTIAL')
        .reduce((sum, p) => sum + p.amount, 0)

      monthlyRevenueHistory.push({
        month: monthLabel,
        revenue: collected + pending + late + partial,
        collected,
        pending: pending + partial,
        late,
      })
    }

    // ─── 2. Payment Status Breakdown ────────────────────────────────────────
    const paymentStatusBreakdown = {
      PAID: { count: 0, amount: 0 },
      PENDING: { count: 0, amount: 0 },
      LATE: { count: 0, amount: 0 },
      PARTIAL: { count: 0, amount: 0 },
      CANCELLED: { count: 0, amount: 0 },
    }

    for (const payment of allPayments) {
      const status = payment.status as keyof typeof paymentStatusBreakdown
      if (paymentStatusBreakdown[status]) {
        paymentStatusBreakdown[status].count += 1
        paymentStatusBreakdown[status].amount += payment.amount
      }
    }

    // ─── 3. Commission Tracking (from active mandats) ───────────────────────
    const activeMandats = mandats.filter((m) => m.status === 'ACTIVE')
    const commissionTracking = activeMandats.map((mandat) => {
      // Calculate commission based on payments collected for this property
      const propertyPayments = allPayments.filter(
        (p) => p.lease.propertyId === mandat.propertyId && p.status === 'PAID'
      )
      const totalCollected = propertyPayments.reduce((sum, p) => sum + p.amount, 0)

      let commissionAmount = 0
      if (mandat.commissionType === 'FIXED' && mandat.fixedCommission) {
        commissionAmount = mandat.fixedCommission
      } else {
        // Percentage-based commission
        commissionAmount = totalCollected * (mandat.commissionRate / 100)
      }

      return {
        mandatId: mandat.id,
        mandatType: mandat.type,
        propertyTitle: mandat.property.title,
        agencyName: `${mandat.agency.firstName} ${mandat.agency.lastName}`,
        commissionRate: mandat.commissionRate,
        commissionType: mandat.commissionType,
        totalCollected,
        commissionAmount: Math.round(commissionAmount * 100) / 100,
        period: `${mandat.startDate.toLocaleDateString('fr-FR')} - ${mandat.endDate.toLocaleDateString('fr-FR')}`,
      }
    })

    const totalCommissionDue = commissionTracking.reduce((sum, c) => sum + c.commissionAmount, 0)

    // ─── 4. Revenue Per Property ────────────────────────────────────────────
    const revenuePerProperty = properties.map((property) => {
      const propertyPayments = allPayments.filter(
        (p) => p.lease.propertyId === property.id
      )

      const collected = propertyPayments
        .filter((p) => p.status === 'PAID')
        .reduce((sum, p) => sum + p.amount, 0)
      const pending = propertyPayments
        .filter((p) => p.status === 'PENDING' || p.status === 'PARTIAL')
        .reduce((sum, p) => sum + p.amount, 0)
      const late = propertyPayments
        .filter((p) => p.status === 'LATE')
        .reduce((sum, p) => sum + p.amount, 0)

      const hasActiveMandat = mandats.some(
        (m) => m.propertyId === property.id && m.status === 'ACTIVE'
      )
      const mandatCommission = hasActiveMandat
        ? mandats
            .filter((m) => m.propertyId === property.id && m.status === 'ACTIVE')
            .reduce((sum, m) => {
              if (m.commissionType === 'FIXED' && m.fixedCommission) return sum + m.fixedCommission
              return sum + collected * (m.commissionRate / 100)
            }, 0)
        : 0

      return {
        propertyId: property.id,
        propertyTitle: property.title,
        city: property.city,
        monthlyRent: property.price,
        isRented: property.rentalStatus === 'loue',
        collected,
        pending,
        late,
        netRevenue: Math.round((collected - mandatCommission) * 100) / 100,
        commission: Math.round(mandatCommission * 100) / 100,
      }
    })

    // ─── 5. Payment Reminders (late payments needing reminders) ─────────────
    const paymentReminders = allPayments
      .filter((p) => p.status === 'LATE')
      .map((p) => ({
        paymentId: p.id,
        amount: p.amount,
        dueDate: p.dueDate,
        daysLate: Math.floor(
          (now.getTime() - new Date(p.dueDate).getTime()) / (1000 * 60 * 60 * 24)
        ),
        tenant: {
          id: p.lease.tenant.id,
          name: `${p.lease.tenant.firstName} ${p.lease.tenant.lastName}`,
          phone: p.lease.tenant.phone,
        },
        property: {
          id: p.lease.property.id,
          title: p.lease.property.title,
        },
        reference: p.reference,
      }))
      .sort((a, b) => b.daysLate - a.daysLate)

    // ─── Summary ────────────────────────────────────────────────────────────
    const totalCollected = allPayments
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + p.amount, 0)
    const totalPendingAmount = allPayments
      .filter((p) => p.status === 'PENDING' || p.status === 'PARTIAL')
      .reduce((sum, p) => sum + p.amount, 0)
    const totalLateAmount = allPayments
      .filter((p) => p.status === 'LATE')
      .reduce((sum, p) => sum + p.amount, 0)
    const netRevenue = Math.round((totalCollected - totalCommissionDue) * 100) / 100

    // ─── 6. Recent Payments List (last 20) ──────────────────────────────────
    const recentPayments = allPayments.slice(0, 20).map((p) => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      dueDate: p.dueDate,
      paidAt: p.paidAt,
      reference: p.reference,
      createdAt: p.createdAt,
      lease: {
        id: p.leaseId,
        monthlyRent: p.lease.monthlyRent,
        property: {
          id: p.lease.property.id,
          title: p.lease.property.title,
          city: p.lease.property.city,
        },
        tenant: {
          id: p.lease.tenant.id,
          firstName: p.lease.tenant.firstName,
          lastName: p.lease.tenant.lastName,
        },
      },
    }))

    return NextResponse.json({
      monthlyRevenueHistory,
      paymentStatusBreakdown,
      commissionTracking: {
        mandats: commissionTracking,
        totalCommissionDue: Math.round(totalCommissionDue * 100) / 100,
      },
      revenuePerProperty,
      paymentReminders,
      recentPayments,
      summary: {
        totalCollected,
        totalPending: totalPendingAmount,
        totalLate: totalLateAmount,
        totalCommissionDue: Math.round(totalCommissionDue * 100) / 100,
        netRevenue,
        propertiesCount: properties.length,
        rentedPropertiesCount: properties.filter((p) => p.rentalStatus === 'loue').length,
      },
    })
  } catch (error) {
    console.error('Owner finances error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
