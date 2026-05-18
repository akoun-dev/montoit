import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// GET /api/tenants — List tenants for the current owner (based on their leases)
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

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || undefined
    const status = searchParams.get('status') || undefined // lease status filter

    // Get all leases for this owner with tenant and property info
    const leases = await db.lease.findMany({
      where: {
        ownerId: userId,
        ...(status ? { status } : {}),
      },
      include: {
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatarUrl: true,
            isActive: true,
          },
        },
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            city: true,
            commune: true,
            images: { orderBy: { order: 'asc' }, take: 1, select: { url: true } },
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
          orderBy: { dueDate: 'desc' },
        },
        rentalFile: {
          select: {
            id: true,
            status: true,
            monthlyIncome: true,
            employer: true,
            employmentType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Group by tenant
    const tenantMap = new Map<string, {
      id: string
      firstName: string
      lastName: string
      email: string
      phone: string | null
      avatarUrl: string | null
      isActive: boolean
      leases: Array<{
        id: string
        status: string
        startDate: string
        endDate: string
        monthlyRent: number
        charges: number
        deposit: number
        property: {
          id: string
          title: string
          address: string
          city: string
          commune: string | null
          images: Array<{ url: string }>
        }
        payments: Array<{
          id: string
          amount: number
          status: string
          dueDate: string
          paidAt: string | null
        }>
        rentalFile: {
          id: string
          status: string
          monthlyIncome: number | null
          employer: string | null
          employmentType: string | null
        } | null
      }>
    }>()

    for (const lease of leases) {
      const t = lease.tenant
      const existing = tenantMap.get(t.id)
      
      const leaseData = {
        id: lease.id,
        status: lease.status,
        startDate: lease.startDate.toISOString(),
        endDate: lease.endDate.toISOString(),
        monthlyRent: lease.monthlyRent,
        charges: lease.charges,
        deposit: lease.deposit,
        property: lease.property,
        payments: lease.payments.map(p => ({
          id: p.id,
          amount: p.amount,
          status: p.status,
          dueDate: p.dueDate.toISOString(),
          paidAt: p.paidAt?.toISOString() || null,
        })),
        rentalFile: lease.rentalFile ? {
          id: lease.rentalFile.id,
          status: lease.rentalFile.status,
          monthlyIncome: lease.rentalFile.monthlyIncome,
          employer: lease.rentalFile.employer,
          employmentType: lease.rentalFile.employmentType,
        } : null,
      }

      if (existing) {
        existing.leases.push(leaseData)
      } else {
        tenantMap.set(t.id, {
          id: t.id,
          firstName: t.firstName,
          lastName: t.lastName,
          email: t.email,
          phone: t.phone,
          avatarUrl: t.avatarUrl,
          isActive: t.isActive,
          leases: [leaseData],
        })
      }
    }

    let tenants = Array.from(tenantMap.values())

    // Apply search filter
    if (search) {
      const q = search.toLowerCase()
      tenants = tenants.filter(t =>
        t.firstName.toLowerCase().includes(q) ||
        t.lastName.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        (t.phone && t.phone.includes(q))
      )
    }

    // Compute stats per tenant
    const tenantsWithStats = tenants.map(t => {
      const allPayments = t.leases.flatMap(l => l.payments)
      const totalPaid = allPayments
        .filter(p => p.status === 'PAID')
        .reduce((sum, p) => sum + p.amount, 0)
      const totalDue = t.leases.reduce((sum, l) => sum + l.monthlyRent, 0)
      const latePayments = allPayments.filter(p => p.status === 'LATE').length
      const pendingPayments = allPayments.filter(p => p.status === 'PENDING').length
      const activeLeases = t.leases.filter(l => l.status === 'ACTIVE').length
      const hasActiveLease = activeLeases > 0

      return {
        ...t,
        stats: {
          totalPaid,
          totalDue,
          latePayments,
          pendingPayments,
          activeLeases,
          hasActiveLease,
        },
      }
    })

    // Compute global stats
    const globalStats = {
      totalTenants: tenantsWithStats.length,
      activeTenants: tenantsWithStats.filter(t => t.stats.hasActiveLease).length,
      totalRevenue: tenantsWithStats.reduce((s, t) => s + t.stats.totalPaid, 0),
      latePayments: tenantsWithStats.reduce((s, t) => s + t.stats.latePayments, 0),
    }

    return NextResponse.json({
      data: tenantsWithStats,
      stats: globalStats,
    })
  } catch (error) {
    console.error('Tenants GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
