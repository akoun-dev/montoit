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

    const admin = getSupabaseAdminClient()

    const { data: profile } = await admin
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single()

    const effectiveRole = profile?.active_role || profile?.role
    if (effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE') {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    const { data: rawProperties } = await admin
      .from('properties')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })

    const propertyIds = (rawProperties ?? []).map(p => p.id)

    const { data: rawVisitRequests } = propertyIds.length > 0
      ? await admin
          .from('visit_requests')
          .select('*')
          .in('property_id', propertyIds)
          .order('created_at', { ascending: false })
      : { data: [] as any[] }

    const { data: rawAllLeases } = propertyIds.length > 0
      ? await admin
          .from('leases')
          .select('*')
          .in('property_id', propertyIds)
      : { data: [] as any[] }

    // Fetch applications on the owner's properties to find relevant rental files
    const { data: ownerPropertyApplications } = propertyIds.length > 0
      ? await admin
          .from('applications')
          .select('rental_file_id, property_id')
          .in('property_id', propertyIds)
      : { data: [] as any[] }

    const appRentalFileIds = [...new Set((ownerPropertyApplications ?? []).map(a => a.rental_file_id).filter(Boolean))]
    const propertyAppMap = new Map<string, string[]>()
    for (const a of (ownerPropertyApplications ?? []) as any[]) {
      if (!propertyAppMap.has(a.rental_file_id)) propertyAppMap.set(a.rental_file_id, [])
      propertyAppMap.get(a.rental_file_id)!.push(a.property_id)
    }

    const { data: rawRentalFiles } = appRentalFileIds.length > 0
      ? await admin
          .from('rental_files')
          .select('*')
          .in('id', appRentalFileIds)
          .in('status', ['VALIDATED'])
          .order('updated_at', { ascending: false })
          .limit(20)
      : { data: [] as any[] }

    const { data: rawActiveLeases } = await admin
      .from('leases')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })

    const allPropIds = propertyIds
    const vrTenantIds = [...new Set((rawVisitRequests ?? []).map(v => v.tenant_id).filter(Boolean))]
    const rfTenantIds = [...new Set((rawRentalFiles ?? []).map(f => f.tenant_id).filter(Boolean))]
    const leaseTenantIds = [...new Set((rawActiveLeases ?? []).map(l => l.tenant_id).filter(Boolean))]
    const allTenantIds = [...new Set([...vrTenantIds, ...rfTenantIds, ...leaseTenantIds])]
    const leasePropIds = [...new Set((rawActiveLeases ?? []).map(l => l.property_id).filter(Boolean))]
    const allLeaseIds = [...new Set([...(rawAllLeases ?? []).map(l => l.id), ...(rawActiveLeases ?? []).map(l => l.id)])]
    const rfIds = (rawRentalFiles ?? []).map(f => f.id)
    const allQueryPropIds = [...new Set([...allPropIds, ...leasePropIds])]

    const [
      { data: allPropImgs },
      { data: allTenants },
      { data: rfDocuments },
      { data: rfLeases },
      { data: allPayments },
    ] = await Promise.all([
      allQueryPropIds.length > 0
        ? admin.from('property_images').select('*').in('property_id', allQueryPropIds).order('order', { ascending: true })
        : { data: [] as any[] },
      allTenantIds.length > 0
        ? admin.from('users').select('id, first_name, last_name, avatar_url, phone, email').in('id', allTenantIds)
        : { data: [] as any[] },
      rfIds.length > 0
        ? admin.from('rental_file_documents').select('*').in('rental_file_id', rfIds)
        : { data: [] as any[] },
      rfIds.length > 0 && propertyIds.length > 0
        ? admin.from('leases').select('id, property_id, rental_file_id').in('rental_file_id', rfIds).in('property_id', propertyIds)
        : { data: [] as any[] },
      allLeaseIds.length > 0
        ? admin.from('payments').select('*').in('lease_id', allLeaseIds).order('due_date', { ascending: true })
        : { data: [] as any[] },
    ])

    // Fetch validated rental files for tenant filtering on visit requests
    const vrTenantIdsArr = [...new Set((rawVisitRequests ?? []).map(v => v.tenant_id).filter(Boolean))]
    let validatedTenantIds = new Set<string>()
    if (vrTenantIdsArr.length > 0) {
      const { data: validatedRfs } = await admin
        .from('rental_files')
        .select('tenant_id')
        .in('tenant_id', vrTenantIdsArr)
        .eq('status', 'VALIDATED')
      validatedTenantIds = new Set((validatedRfs ?? []).map(r => r.tenant_id))
    }

    const propMap = new Map((rawProperties ?? []).map(p => [p.id, p]))
    const propImgMap = groupBy(allPropImgs ?? [], 'property_id')
    const tenantMap = new Map((allTenants ?? []).map(t => [t.id, t]))
    const rfDocMap = groupBy(rfDocuments ?? [], 'rental_file_id')
    const rfLeaseMap = groupBy(rfLeases ?? [], 'rental_file_id')
    const paymentByLease = groupBy(allPayments ?? [], 'lease_id')

    const properties = (rawProperties ?? []).map(p => {
      const images = propImgMap.get(p.id) ?? []
      return {
        id: p.id,
        title: p.title,
        type: p.type,
        price: p.price,
        city: p.city,
        commune: p.commune,
        status: p.status,
        rentalStatus: p.rental_status,
        bedrooms: p.bedrooms,
        area: p.area,
        address: p.address,
        createdAt: p.created_at,
        images: images.slice(0, 1).map(i => ({
          id: i.id,
          url: i.url,
          order: i.order,
          createdAt: i.created_at,
          propertyId: i.property_id,
        })),
      }
    })

    const visitRequests = (rawVisitRequests ?? []).filter(v => validatedTenantIds.has(v.tenant_id)).map(v => {
      const tenant = tenantMap.get(v.tenant_id)
      const prop = propMap.get(v.property_id)
      return {
        id: v.id,
        propertyId: v.property_id,
        tenantId: v.tenant_id,
        visitType: v.visit_type,
        requestedDate: v.requested_date,
        timeSlot: v.time_slot,
        status: v.status,
        tenantMessage: v.tenant_message,
        createdAt: v.created_at,
        tenant: tenant ? {
          firstName: tenant.first_name,
          lastName: tenant.last_name,
          phone: tenant.phone,
        } : null,
        property: prop ? {
          title: prop.title,
          city: prop.city,
        } : null,
      }
    })

    const rentalFiles = (rawRentalFiles ?? []).map(rf => {
      const tenant = tenantMap.get(rf.tenant_id)
      const linkedPropIds = propertyAppMap.get(rf.id) ?? []
      const linkedProperty = linkedPropIds.length > 0 ? propMap.get(linkedPropIds[0]) : null
      return {
        id: rf.id,
        tenantId: rf.tenant_id,
        status: rf.status,
        tenantCategory: rf.tenant_category,
        createdAt: rf.created_at,
        updatedAt: rf.updated_at,
        tenant: tenant ? {
          firstName: tenant.first_name,
          lastName: tenant.last_name,
          phone: tenant.phone,
        } : null,
        property: linkedProperty ? {
          id: linkedProperty.id,
          title: linkedProperty.title,
        } : null,
        documents: (rfDocMap.get(rf.id) ?? []).map(d => ({
          id: d.id,
          rentalFileId: d.rental_file_id,
          type: d.type,
          url: d.url,
          name: d.name,
          createdAt: d.created_at,
        })),
      }
    })

    const activeLeases = (rawActiveLeases ?? []).map(l => {
      const tenant = tenantMap.get(l.tenant_id)
      const prop = propMap.get(l.property_id)
      const images = propImgMap.get(l.property_id) ?? []
      const payments = paymentByLease.get(l.id) ?? []
      return {
        id: l.id,
        status: l.status,
        monthlyRent: l.monthly_rent,
        charges: l.charges,
        deposit: l.deposit,
        startDate: l.start_date,
        endDate: l.end_date,
        tenantId: l.tenant_id,
        ownerId: l.owner_id,
        propertyId: l.property_id,
        createdAt: l.created_at,
        ownerSignedAt: l.owner_signed_at,
        tenantSignedAt: l.tenant_signed_at,
        tenant: tenant ? {
          id: tenant.id,
          firstName: tenant.first_name,
          lastName: tenant.last_name,
          avatarUrl: tenant.avatar_url,
          phone: tenant.phone,
        } : null,
        property: prop ? {
          title: prop.title,
          city: prop.city,
          address: prop.address,
          images: images.slice(0, 1).map(i => ({
            id: i.id,
            url: i.url,
            order: i.order,
            createdAt: i.created_at,
            propertyId: i.property_id,
          })),
        } : null,
        payments: payments.map(p => ({
          id: p.id,
          amount: p.amount,
          status: p.status,
          dueDate: p.due_date,
          paidAt: p.paid_at,
        })),
      }
    })

    const activeLeasesEnhanced = activeLeases.map(lease => {
      const leasePayments = lease.payments || []
      const latePayments = leasePayments.filter(p => p.status === 'LATE')
      const pendingPayments = leasePayments.filter(p => p.status === 'PENDING')
      const paidPayments = leasePayments.filter(p => p.status === 'PAID')

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

    const activeLeaseList = activeLeasesEnhanced.filter(l => l.status === 'ACTIVE')
    const totalRevenue = activeLeaseList.reduce((sum, l) => sum + l.monthlyRent, 0)
    const totalRevenueFromPayments = activeLeaseList.reduce((sum, l) => sum + (l as any).totalPaid, 0)
    const overallLatePayments = activeLeaseList.reduce((sum, l) => sum + (l as any).latePaymentsCount, 0)

    // ─── Monthly revenue for chart (last 12 months) ────────────────────────────
    const now = new Date()
    const monthlyRevenue: Array<{ month: string; revenue: number }> = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const monthPayments = (allPayments ?? []).filter((p: any) => {
        if (p.status !== 'PAID') return false
        const pd = new Date(p.paid_at || p.due_date)
        return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear()
      })
      const revenue = monthPayments.reduce((sum: number, p: any) => sum + p.amount, 0)
      monthlyRevenue.push({ month: key, revenue })
    }

    // ─── Performance stats (views, favorites, contacts) ────────────────────────
    let totalViews = 0
    let totalFavorites = 0
    if (propertyIds.length > 0) {
      const { data: viewCounts } = await admin
        .from('properties')
        .select('views_count')
        .in('id', propertyIds)
      totalViews = (viewCounts ?? []).reduce((sum: number, p: any) => sum + (p.views_count || 0), 0)

      const { count: favCount } = await admin
        .from('favorites')
        .select('id', { count: 'exact', head: true })
        .in('property_id', propertyIds)
      totalFavorites = favCount ?? 0
    }

    const totalVisitRequests = (rawVisitRequests ?? []).length
    const conversionRate = totalVisitRequests > 0
      ? Math.round((activeLeaseList.length / totalVisitRequests) * 100)
      : 0

    // ─── Expiring contracts (within 30 days) ───────────────────────────────────
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const expiringContracts = activeLeasesEnhanced.filter(l => l.status === 'ACTIVE' && new Date(l.endDate) <= thirtyDaysFromNow)

    // ─── Recent payments ────────────────────────────────────────────────────────
    const recentPayments = (allPayments ?? [])
      .sort((a: any, b: any) => new Date(b.created_at || b.due_date).getTime() - new Date(a.created_at || a.due_date).getTime())
      .slice(0, 10)
      .map((p: any) => {
        const lease = (rawAllLeases ?? []).find((l: any) => l.id === p.lease_id)
        const prop = propMap.get(lease?.property_id)
        const tenant = lease ? tenantMap.get(lease.tenant_id) : null
        return {
          id: p.id,
          amount: p.amount,
          status: p.status,
          dueDate: p.due_date,
          paidAt: p.paid_at,
          tenant: tenant ? { firstName: tenant.first_name, lastName: tenant.last_name } : null,
          property: prop ? { title: prop.title } : null,
        }
      })

    // ─── Housing type distribution for stats ───────────────────────────────────
    const housingTypeDistribution: Record<string, number> = {}
    for (const p of rawProperties ?? []) {
      housingTypeDistribution[p.type] = (housingTypeDistribution[p.type] || 0) + 1
    }

    const resp = NextResponse.json({
      properties,
      visitRequests,
      rentalFiles,
      activeLeases: activeLeasesEnhanced,
      stats: {
        totalProperties: properties.length,
        activeProperties: properties.filter(p => p.status === 'ACTIVE').length,
        pendingVisits: visitRequests.filter(v => v.status === 'PENDING').length,
        activeLeases: activeLeaseList.length,
        totalRevenue,
        totalRevenueFromPayments,
        latePaymentsCount: overallLatePayments,
        totalViews,
        totalFavorites,
        conversionRate,
        occupiedProperties: properties.filter(p => p.rentalStatus === 'RENTED' || p.status === 'RENTED').length,
        availableProperties: properties.filter(p => p.status === 'ACTIVE' && p.rentalStatus !== 'RENTED').length,
        occupancyRate: properties.length > 0 ? Math.round((properties.filter(p => p.rentalStatus === 'RENTED' || p.status === 'RENTED').length / properties.length) * 100) : 0,
        monthlyRevenue,
        expiringContractsCount: expiringContracts.length,
        recentPayments: recentPayments,
        housingTypeDistribution,
      },
      monthlyRevenue,
      expiringContracts: expiringContracts.map(l => ({
        id: l.id,
        monthlyRent: l.monthlyRent,
        startDate: l.startDate,
        endDate: l.endDate,
        property: l.property ? { title: l.property.title } : null,
        tenant: l.tenant ? { firstName: l.tenant.firstName, lastName: l.tenant.lastName } : null,
        contractStatus: l.status,
      })),
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Proprietaire dashboard error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

function groupBy(arr: any[], key: string) {
  const map = new Map<string, any[]>()
  for (const item of arr) {
    const k = item[key]
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(item)
  }
  return map
}
