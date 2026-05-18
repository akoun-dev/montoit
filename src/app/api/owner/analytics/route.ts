import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const { data: profile } = await supabase
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single()

    const effectiveRole = profile?.active_role || profile?.role
    if (effectiveRole !== 'PROPRIETAIRE') {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    const { data: rawProperties } = await supabase
      .from('properties')
      .select('id, title, city, price, status, rental_status, created_at')
      .eq('owner_id', userId)

    if (!rawProperties) {
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    const properties = rawProperties.map((p: any) => ({
      id: p.id,
      title: p.title,
      city: p.city,
      price: p.price,
      status: p.status,
      rentalStatus: p.rental_status,
      createdAt: p.created_at,
    }))

    const propertyIds = properties.map(p => p.id)

    if (propertyIds.length === 0) {
      const resp = NextResponse.json({
        occupancyRate: 0,
        monthlyRevenue: [],
        averageLeaseDurationMonths: 0,
        perPropertyPerformance: [],
        latePaymentsTrend: [],
        totals: {
          totalRevenue: 0, totalPaid: 0, totalPending: 0,
          latePaymentsCount: 0, totalProperties: 0, rentedProperties: 0, activeLeases: 0,
        },
      })
      return applyCookies(resp)
    }

    const { data: rawAllLeases } = await supabase
      .from('leases')
      .select('*')
      .eq('owner_id', userId)

    const leasesData = rawAllLeases || []
    const leaseIds = leasesData.map(l => l.id)

    const leasePropertyMap: Record<string, string> = {}
    for (const l of leasesData) {
      leasePropertyMap[l.id] = l.property_id
    }

    const activeLeasesRaw = leasesData.filter(l => l.status === 'ACTIVE')
    const activePropIds = [...new Set(activeLeasesRaw.map(l => l.property_id))]
    const activeTenantIds = [...new Set(activeLeasesRaw.map(l => l.tenant_id))]

    const [leasePropsRes, leaseTenantsRes] = await Promise.all([
      activePropIds.length > 0
        ? supabase.from('properties').select('id, title, city, price').in('id', activePropIds)
        : { data: [] as any[] },
      activeTenantIds.length > 0
        ? supabase.from('users').select('id, first_name, last_name').in('id', activeTenantIds)
        : { data: [] as any[] },
    ])

    const propMap: Record<string, any> = {}
    for (const p of (leasePropsRes.data || [])) {
      propMap[p.id] = { id: p.id, title: p.title, city: p.city, price: p.price }
    }

    const tenantMap: Record<string, any> = {}
    for (const t of (leaseTenantsRes.data || [])) {
      tenantMap[t.id] = { id: t.id, firstName: t.first_name, lastName: t.last_name }
    }

    const activeLeases = activeLeasesRaw.map(l => ({
      id: l.id,
      ownerId: l.owner_id,
      tenantId: l.tenant_id,
      propertyId: l.property_id,
      status: l.status,
      startDate: l.start_date,
      endDate: l.end_date,
      monthlyRent: l.monthly_rent,
      property: propMap[l.property_id] || { id: l.property_id, title: '', city: '', price: 0 },
      tenant: tenantMap[l.tenant_id] || { id: l.tenant_id, firstName: '', lastName: '' },
      payments: [],
    }))

    const { data: rawPayments } = leaseIds.length > 0
      ? await supabase.from('payments').select('*').in('lease_id', leaseIds).order('due_date', { ascending: false })
      : { data: [] as any[] }

    const allPayments = (rawPayments || []).map((p: any) => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      dueDate: p.due_date,
      paidAt: p.paid_at,
      leaseId: p.lease_id,
      lease: {
        propertyId: leasePropertyMap[p.lease_id] || '',
        property: {
          id: propMap[leasePropertyMap[p.lease_id]]?.id || '',
          title: propMap[leasePropertyMap[p.lease_id]]?.title || '',
        },
      },
    }))

    const { data: rawVisitReqs } = await supabase
      .from('visit_requests')
      .select('property_id, status, created_at')
      .in('property_id', propertyIds)

    const visitRequests = (rawVisitReqs || []).map((vr: any) => ({
      propertyId: vr.property_id,
      status: vr.status,
      createdAt: vr.created_at,
    }))

    const allLeases = leasesData.map(l => ({
      id: l.id,
      startDate: l.start_date,
      endDate: l.end_date,
      status: l.status,
      propertyId: l.property_id,
    }))

    const totalProperties = properties.length
    const rentedProperties = properties.filter(p => p.rentalStatus === 'loue').length
    const occupancyRate = totalProperties > 0 ? Math.round((rentedProperties / totalProperties) * 100) : 0

    const now = new Date()
    const monthlyRevenue: { month: string; revenue: number; paid: number; pending: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)
      const monthLabel = monthStart.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' })

      const monthPayments = allPayments.filter(p => {
        const dueDate = new Date(p.dueDate)
        return dueDate >= monthStart && dueDate <= monthEnd
      })

      const paid = monthPayments
        .filter(p => p.status === 'PAID')
        .reduce((sum, p) => sum + p.amount, 0)
      const pending = monthPayments
        .filter(p => p.status === 'PENDING' || p.status === 'LATE' || p.status === 'PARTIAL')
        .reduce((sum, p) => sum + p.amount, 0)

      monthlyRevenue.push({ month: monthLabel, revenue: paid + pending, paid, pending })
    }

    const completedLeases = allLeases.filter(l => l.status === 'TERMINATED' || l.status === 'EXPIRED')
    let averageLeaseDurationMonths = 0
    if (completedLeases.length > 0) {
      const totalDurationDays = completedLeases.reduce((sum, l) => {
        const start = new Date(l.startDate)
        const end = new Date(l.endDate)
        return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      }, 0)
      averageLeaseDurationMonths = Math.round((totalDurationDays / completedLeases.length / 30.44) * 10) / 10
    }

    const visitCountByProperty: Record<string, number> = {}
    for (const vr of visitRequests) {
      visitCountByProperty[vr.propertyId] = (visitCountByProperty[vr.propertyId] || 0) + 1
    }

    const perPropertyPerformance = properties.map(property => {
      const propertyLeases = activeLeases.filter(l => l.propertyId === property.id)
      const propertyPayments = allPayments.filter(p => p.lease.propertyId === property.id)

      const revenue = propertyPayments
        .filter(p => p.status === 'PAID')
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
        monthlyRent: propertyLeases.reduce((sum, l) => sum + (l.monthlyRent || 0), 0),
      }
    })

    const latePaymentsTrend: { month: string; count: number; amount: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)
      const monthLabel = monthStart.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' })

      const lateThisMonth = allPayments.filter(p => {
        const dueDate = new Date(p.dueDate)
        return p.status === 'LATE' && dueDate >= monthStart && dueDate <= monthEnd
      })

      latePaymentsTrend.push({
        month: monthLabel,
        count: lateThisMonth.length,
        amount: lateThisMonth.reduce((sum, p) => sum + p.amount, 0),
      })
    }

    const totalRevenue = allPayments
      .filter(p => p.status === 'PAID')
      .reduce((sum, p) => sum + p.amount, 0)

    const totalPending = allPayments
      .filter(p => p.status === 'PENDING' || p.status === 'LATE' || p.status === 'PARTIAL')
      .reduce((sum, p) => sum + p.amount, 0)

    const latePaymentsCount = allPayments.filter(p => p.status === 'LATE').length

    const resp = NextResponse.json({
      occupancyRate,
      monthlyRevenue,
      averageLeaseDurationMonths,
      perPropertyPerformance,
      latePaymentsTrend,
      totals: {
        totalRevenue,
        totalPaid: totalRevenue,
        totalPending,
        latePaymentsCount,
        totalProperties,
        rentedProperties,
        activeLeases: activeLeases.length,
      },
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Owner analytics error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
