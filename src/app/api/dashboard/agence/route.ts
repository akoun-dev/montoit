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

    if (effectiveRole !== 'AGENCE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // ─── Parallel data fetching ────────────────────────────────────────────
    const [
      properties,
      activeMandats,
      agents,
      commissions,
      signalements,
    ] = await Promise.all([
      // All properties owned by the agency
      db.property.findMany({
        where: { ownerId: userId },
        include: {
          images: { orderBy: { order: 'asc' }, take: 1 },
          mandats: { where: { agencyId: userId } },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // Active mandats where agencyId = userId
      db.mandat.findMany({
        where: { agencyId: userId, status: 'ACTIVE' },
        include: {
          property: { select: { id: true, title: true, city: true } },
          owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),

      // Agency agents
      db.agencyAgent.findMany({
        where: { agencyId: userId },
        include: {
          assignedProperties: { include: { property: { select: { id: true, title: true } } } },
          commissions: { where: { status: 'PAID' } },
        },
      }),

      // Commissions
      db.commission.findMany({
        where: { agencyId: userId },
        include: {
          agent: { select: { id: true, firstName: true, lastName: true, email: true } },
          mandat: { select: { id: true, commissionRate: true, property: { select: { title: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // Signalements
      db.signalement.findMany({
        where: { reporterId: userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])

    // ─── Property IDs owned by agency ──────────────────────────────────────
    const propertyIds = properties.map((p) => p.id)

    // ─── Visit requests for agency properties ──────────────────────────────
    const visitRequests = await db.visitRequest.findMany({
      where: { propertyId: { in: propertyIds } },
      include: {
        tenant: { select: { firstName: true, lastName: true, phone: true } },
        property: { select: { title: true, city: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    // ─── Active leases for agency properties ───────────────────────────────
    const activeLeases = await db.lease.findMany({
      where: { propertyId: { in: propertyIds } },
      include: {
        tenant: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, phone: true } },
        property: { select: { title: true, city: true, address: true, images: { orderBy: { order: 'asc' }, take: 1 } } },
        payments: { select: { id: true, amount: true, status: true, dueDate: true, paidAt: true }, orderBy: { dueDate: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // ─── Rental files for agency properties ────────────────────────────────
    const rentalFiles = await db.rentalFile.findMany({
      where: { status: { in: ['SUBMITTED', 'TC_REVIEW', 'VALIDATED'] } },
      include: {
        tenant: { select: { firstName: true, lastName: true, phone: true, email: true } },
        leases: { where: { propertyId: { in: propertyIds } }, select: { id: true, propertyId: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    })

    // Filter rental files that have at least one lease on agency property
    const agencyRentalFiles = rentalFiles.filter((rf) => rf.leases.length > 0)

    // ─── All mandats for agency ────────────────────────────────────────────
    const allMandats = await db.mandat.findMany({
      where: { agencyId: userId },
      include: {
        property: { select: { id: true, title: true, city: true } },
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // ─── Stats calculations ────────────────────────────────────────────────
    const activeLeaseList = activeLeases.filter((l) => l.status === 'ACTIVE')
    const totalRevenue = activeLeaseList.reduce((sum, l) => sum + l.monthlyRent, 0)
    const totalCommissions = commissions.reduce((sum, c) => sum + c.amount, 0)
    const paidCommissions = commissions.filter((c) => c.status === 'PAID').reduce((sum, c) => sum + c.amount, 0)
    const pendingCommissions = commissions.filter((c) => c.status === 'PENDING').reduce((sum, c) => sum + c.amount, 0)
    const pendingVisits = visitRequests.filter((v) => v.status === 'PENDING').length

    // Mandats expiring within 30 days
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const expiringMandats = allMandats.filter(
      (m) => m.status === 'ACTIVE' && new Date(m.endDate) <= thirtyDaysFromNow
    )

    // Late payments on agency leases
    const latePaymentsCount = activeLeaseList.reduce((sum, l) => {
      return sum + (l.payments?.filter((p) => p.status === 'LATE').length ?? 0)
    }, 0)

    // Agent stats with commission totals
    const agentStats = agents.map((agent) => ({
      id: agent.id,
      firstName: agent.firstName,
      lastName: agent.lastName,
      email: agent.email,
      phone: agent.phone,
      role: agent.role,
      status: agent.status,
      avatarUrl: agent.avatarUrl,
      assignedPropertiesCount: agent.assignedProperties.length,
      totalCommissions: agent.commissions.reduce((sum, c) => sum + c.amount, 0),
    }))

    return NextResponse.json({
      stats: {
        totalProperties: properties.length,
        activeProperties: properties.filter((p) => p.status === 'ACTIVE').length,
        activeMandats: activeMandats.length,
        activeLeases: activeLeaseList.length,
        totalAgents: agents.length,
        totalCommissions,
        paidCommissions,
        pendingCommissions,
        totalRevenue,
        pendingVisits,
        latePaymentsCount,
        expiringMandatsCount: expiringMandats.length,
      },
      properties: properties.map((p) => ({
        id: p.id,
        title: p.title,
        type: p.type,
        price: p.price,
        city: p.city,
        commune: p.commune,
        status: p.status,
        rentalStatus: p.rentalStatus,
        bedrooms: p.bedrooms,
        area: p.area,
        viewsCount: p.viewsCount,
        images: p.images,
        hasMandat: p.mandats.length > 0,
      })),
      allMandats: allMandats.map((m) => ({
        id: m.id,
        type: m.type,
        status: m.status,
        commissionRate: m.commissionRate,
        commissionType: m.commissionType,
        fixedCommission: m.fixedCommission,
        startDate: m.startDate,
        endDate: m.endDate,
        conditions: m.conditions,
        ownerSignedAt: m.ownerSignedAt,
        agencySignedAt: m.agencySignedAt,
        property: m.property,
        owner: m.owner,
      })),
      visitRequests: visitRequests.map((v) => ({
        id: v.id,
        visitType: v.visitType,
        requestedDate: v.requestedDate,
        timeSlot: v.timeSlot,
        status: v.status,
        tenantMessage: v.tenantMessage,
        createdAt: v.createdAt,
        tenant: v.tenant,
        property: v.property,
      })),
      activeLeases: activeLeases.map((l) => ({
        id: l.id,
        status: l.status,
        monthlyRent: l.monthlyRent,
        charges: l.charges,
        deposit: l.deposit,
        startDate: l.startDate,
        endDate: l.endDate,
        tenant: l.tenant,
        property: l.property,
        payments: l.payments,
      })),
      rentalFiles: agencyRentalFiles.map((rf) => ({
        id: rf.id,
        status: rf.status,
        tenantCategory: rf.tenantCategory,
        createdAt: rf.createdAt,
        tenant: rf.tenant,
      })),
      agents: agentStats,
      commissions: commissions.map((c) => ({
        id: c.id,
        amount: c.amount,
        rate: c.rate,
        status: c.status,
        description: c.description,
        paidAt: c.paidAt,
        createdAt: c.createdAt,
        agent: c.agent,
        mandat: c.mandat,
      })),
      signalements,
      expiringMandats: expiringMandats.map((m) => ({
        id: m.id,
        endDate: m.endDate,
        property: m.property,
        owner: m.owner,
      })),
    })
  } catch (error) {
    console.error('Agence dashboard error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
