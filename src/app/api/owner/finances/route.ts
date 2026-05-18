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

    const { data: ownerLeases } = await supabase
      .from('leases')
      .select('id, tenant_id, monthly_rent, property_id')
      .eq('owner_id', userId)

    const leases = ownerLeases || []
    const leaseIds = leases.map(l => l.id)
    const tenantIds = [...new Set(leases.map(l => l.tenant_id))]
    const propertyIdsFromLeases = [...new Set(leases.map(l => l.property_id))]

    const [paymentsRes, tenantsRes, propertiesRes, mandatsRes, agenciesRes, mandatPropsRes, ownerPropsRes] = await Promise.all([
      leaseIds.length > 0
        ? supabase.from('payments').select('*').in('lease_id', leaseIds).order('due_date', { ascending: false })
        : { data: [] as any[] },
      tenantIds.length > 0
        ? supabase.from('users').select('id, first_name, last_name, phone').in('id', tenantIds)
        : { data: [] as any[] },
      propertyIdsFromLeases.length > 0
        ? supabase.from('properties').select('id, title, city').in('id', propertyIdsFromLeases)
        : { data: [] as any[] },
      supabase.from('mandats').select('*').eq('owner_id', userId),
      Promise.resolve({ data: [] as any[] }),
      Promise.resolve({ data: [] as any[] }),
      supabase.from('properties').select('id, title, city, price, rental_status').eq('owner_id', userId),
    ])

    const tenantMap: Record<string, any> = {}
    for (const t of (tenantsRes.data || [])) {
      tenantMap[t.id] = { id: t.id, firstName: t.first_name, lastName: t.last_name, phone: t.phone }
    }

    const propMap: Record<string, any> = {}
    for (const p of (propertiesRes.data || [])) {
      propMap[p.id] = { id: p.id, title: p.title, city: p.city }
    }

    const leaseMap: Record<string, any> = {}
    for (const l of leases) {
      leaseMap[l.id] = {
        monthlyRent: l.monthly_rent,
        propertyId: l.property_id,
        property: propMap[l.property_id] || { id: '', title: '', city: '' },
        tenant: tenantMap[l.tenant_id] || { id: '', firstName: '', lastName: '', phone: '' },
      }
    }

    const allPayments = (paymentsRes.data || []).map((p: any) => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      dueDate: p.due_date,
      paidAt: p.paid_at,
      reference: p.reference,
      createdAt: p.created_at,
      leaseId: p.lease_id,
      lease: leaseMap[p.lease_id] || {
        monthlyRent: 0, propertyId: '',
        property: { id: '', title: '', city: '' },
        tenant: { id: '', firstName: '', lastName: '', phone: '' },
      },
    }))

    const rawMandats = (mandatsRes.data || []) as any[]
    const agencyIds = [...new Set(rawMandats.map(m => m.agency_id))]

    const { data: agencies } = agencyIds.length > 0
      ? await supabase.from('users').select('id, first_name, last_name').in('id', agencyIds)
      : { data: [] as any[] }

    const agencyMap: Record<string, any> = {}
    for (const a of (agencies || [])) {
      agencyMap[a.id] = { id: a.id, firstName: a.first_name, lastName: a.last_name }
    }

    const mandatPropertyIds = [...new Set(rawMandats.map(m => m.property_id))]
    const { data: mandatProps } = mandatPropertyIds.length > 0
      ? await supabase.from('properties').select('id, title, city').in('id', mandatPropertyIds)
      : { data: [] as any[] }

    const mandatPropMap: Record<string, any> = {}
    for (const p of (mandatProps || [])) {
      mandatPropMap[p.id] = { id: p.id, title: p.title, city: p.city }
    }

    const mandats = rawMandats.map((m: any) => ({
      id: m.id,
      type: m.type,
      status: m.status,
      commissionRate: m.commission_rate,
      commissionType: m.commission_type,
      fixedCommission: m.fixed_commission,
      startDate: m.start_date,
      endDate: m.end_date,
      propertyId: m.property_id,
      property: mandatPropMap[m.property_id] || { id: '', title: '', city: '' },
      agency: agencyMap[m.agency_id] || { id: '', firstName: '', lastName: '' },
    }))

    const ownerProps = (ownerPropsRes.data || []) as any[]
    const properties = ownerProps.map((p: any) => ({
      id: p.id,
      title: p.title,
      city: p.city,
      price: p.price,
      rentalStatus: p.rental_status,
    }))

    const now = new Date()

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

      const monthPayments = allPayments.filter(p => {
        const dueDate = new Date(p.dueDate)
        return dueDate >= monthStart && dueDate <= monthEnd
      })

      const collected = monthPayments
        .filter(p => p.status === 'PAID')
        .reduce((sum, p) => sum + p.amount, 0)
      const pending = monthPayments
        .filter(p => p.status === 'PENDING')
        .reduce((sum, p) => sum + p.amount, 0)
      const late = monthPayments
        .filter(p => p.status === 'LATE')
        .reduce((sum, p) => sum + p.amount, 0)
      const partial = monthPayments
        .filter(p => p.status === 'PARTIAL')
        .reduce((sum, p) => sum + p.amount, 0)

      monthlyRevenueHistory.push({
        month: monthLabel,
        revenue: collected + pending + late + partial,
        collected,
        pending: pending + partial,
        late,
      })
    }

    const paymentStatusBreakdown: Record<string, { count: number; amount: number }> = {
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

    const activeMandats = mandats.filter(m => m.status === 'ACTIVE')
    const commissionTracking = activeMandats.map(mandat => {
      const propertyPayments = allPayments.filter(
        p => p.lease.propertyId === mandat.propertyId && p.status === 'PAID'
      )
      const totalCollected = propertyPayments.reduce((sum, p) => sum + p.amount, 0)

      let commissionAmount = 0
      if (mandat.commissionType === 'FIXED' && mandat.fixedCommission) {
        commissionAmount = mandat.fixedCommission
      } else {
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
        period: `${new Date(mandat.startDate).toLocaleDateString('fr-FR')} - ${new Date(mandat.endDate).toLocaleDateString('fr-FR')}`,
      }
    })

    const totalCommissionDue = commissionTracking.reduce((sum, c) => sum + c.commissionAmount, 0)

    const revenuePerProperty = properties.map(property => {
      const propertyPayments = allPayments.filter(p => p.lease.propertyId === property.id)

      const collected = propertyPayments
        .filter(p => p.status === 'PAID')
        .reduce((sum, p) => sum + p.amount, 0)
      const pending = propertyPayments
        .filter(p => p.status === 'PENDING' || p.status === 'PARTIAL')
        .reduce((sum, p) => sum + p.amount, 0)
      const late = propertyPayments
        .filter(p => p.status === 'LATE')
        .reduce((sum, p) => sum + p.amount, 0)

      const hasActiveMandat = mandats.some(
        m => m.propertyId === property.id && m.status === 'ACTIVE'
      )
      const mandatCommission = hasActiveMandat
        ? mandats
            .filter(m => m.propertyId === property.id && m.status === 'ACTIVE')
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

    const paymentReminders = allPayments
      .filter(p => p.status === 'LATE')
      .map(p => ({
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

    const totalCollected = allPayments
      .filter(p => p.status === 'PAID')
      .reduce((sum, p) => sum + p.amount, 0)
    const totalPendingAmount = allPayments
      .filter(p => p.status === 'PENDING' || p.status === 'PARTIAL')
      .reduce((sum, p) => sum + p.amount, 0)
    const totalLateAmount = allPayments
      .filter(p => p.status === 'LATE')
      .reduce((sum, p) => sum + p.amount, 0)
    const netRevenue = Math.round((totalCollected - totalCommissionDue) * 100) / 100

    const recentPayments = allPayments.slice(0, 20).map(p => ({
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

    const resp = NextResponse.json({
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
        rentedPropertiesCount: properties.filter(p => p.rentalStatus === 'loue').length,
      },
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Owner finances error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
