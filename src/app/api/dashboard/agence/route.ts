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
    if (effectiveRole !== 'AGENCE') {
      const resp = NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      return applyCookies(resp)
    }

    const [
      { data: rawPropertiesData },
      { data: rawActiveMandatsData },
      { data: rawAgentsData },
      { data: rawCommissionsData },
      { data: rawSignalementsData },
      { data: rawAllMandatsData },
    ] = await Promise.all([
      admin.from('properties').select('*').eq('owner_id', userId).order('created_at', { ascending: false }),
      admin.from('property_mandats').select('*').eq('agency_id', userId).eq('status', 'ACTIVE'),
      admin.from('agency_agents').select('*').eq('agency_id', userId),
      admin.from('commissions').select('*').eq('agency_id', userId).order('created_at', { ascending: false }),
      admin.from('signalements').select('*').eq('reporter_id', userId).order('created_at', { ascending: false }).limit(10),
      admin.from('property_mandats').select('*').eq('agency_id', userId).order('created_at', { ascending: false }),
    ])

    const rawProperties = (rawPropertiesData ?? []) as any[]
    const rawActiveMandats = (rawActiveMandatsData ?? []) as any[]
    const rawAgents = (rawAgentsData ?? []) as any[]
    const rawCommissions = (rawCommissionsData ?? []) as any[]
    const rawSignalements = (rawSignalementsData ?? []) as any[]
    const rawAllMandats = (rawAllMandatsData ?? []) as any[]

    const propertyIds = rawProperties.map(p => p.id)

    // Fetch related data
    const agentIds = rawAgents.map(a => a.id)
    const mandatPropIds = [...new Set([...rawActiveMandats.map(m => m.property_id).filter(Boolean), ...rawAllMandats.map(m => m.property_id).filter(Boolean)])]
    const mandatOwnerIds = [...new Set([...rawActiveMandats.map(m => m.owner_id).filter(Boolean), ...rawAllMandats.map(m => m.owner_id).filter(Boolean)])]
    const commissionAgentIds = [...new Set(rawCommissions.map(c => c.agent_id).filter(Boolean))]
    const commissionMandatIds = [...new Set(rawCommissions.map(m => m.mandat_id).filter(Boolean))]

    const [
      { data: allPropImgsData },
      { data: allMandatPropsData },
      { data: allMandatOwnersData },
      { data: allCommissionAgentsData },
      { data: allCommissionMandatsData },
      { data: assignedPropsData },
      { data: agentCommissionsData },
      { data: rawVisitRequestsData },
      { data: rawActiveLeasesData },
      { data: rawRentalFilesData },
    ] = await Promise.all([
      propertyIds.length > 0
        ? admin.from('property_images').select('*').in('property_id', propertyIds).order('order', { ascending: true })
        : { data: [] as any[] },
      mandatPropIds.length > 0
        ? admin.from('properties').select('id, title, city').in('id', mandatPropIds)
        : { data: [] as any[] },
      mandatOwnerIds.length > 0
        ? admin.from('users').select('id, first_name, last_name, email').in('id', mandatOwnerIds)
        : { data: [] as any[] },
      commissionAgentIds.length > 0
        ? admin.from('users').select('id, first_name, last_name, email').in('id', commissionAgentIds)
        : { data: [] as any[] },
      commissionMandatIds.length > 0
        ? admin.from('property_mandats').select('id, commission_rate, property_id').in('id', commissionMandatIds)
        : { data: [] as any[] },
      agentIds.length > 0
        ? admin.from('assigned_properties').select('*, properties!inner(id, title)').in('agent_id', agentIds)
        : { data: [] as any[] },
      agentIds.length > 0
        ? admin.from('commissions').select('*').in('agent_id', agentIds).eq('status', 'PAID')
        : { data: [] as any[] },
      propertyIds.length > 0
        ? admin.from('visit_requests').select('*').in('property_id', propertyIds).order('created_at', { ascending: false }).limit(20)
        : { data: [] as any[] },
      propertyIds.length > 0
        ? admin.from('leases').select('*').in('property_id', propertyIds).order('created_at', { ascending: false })
        : { data: [] as any[] },
      admin.from('rental_files').select('*').in('status', ['SUBMITTED', 'TC_REVIEW', 'VALIDATED']).order('updated_at', { ascending: false }).limit(20),
    ])

    const allPropImgs = (allPropImgsData ?? []) as any[]
    const allMandatProps = (allMandatPropsData ?? []) as any[]
    const allMandatOwners = (allMandatOwnersData ?? []) as any[]
    const allCommissionAgents = (allCommissionAgentsData ?? []) as any[]
    const allCommissionMandats = (allCommissionMandatsData ?? []) as any[]
    const assignedProps = (assignedPropsData ?? []) as any[]
    const agentCommissions = (agentCommissionsData ?? []) as any[]
    const rawVisitRequests = (rawVisitRequestsData ?? []) as any[]
    const rawActiveLeases = (rawActiveLeasesData ?? []) as any[]
    const rawRentalFiles = (rawRentalFilesData ?? []) as any[]

    // Fetch tenant IDs for visit requests and rental files
    const vrTenantIds = [...new Set(rawVisitRequests.map(v => v.tenant_id).filter((id): id is string => !!id))]
    const rfTenantIds = [...new Set(rawRentalFiles.map(f => f.tenant_id).filter((id): id is string => !!id))]
    const leaseTenantIds = [...new Set(rawActiveLeases.map(l => l.tenant_id).filter((id): id is string => !!id))]
    const allTenantIds = [...new Set([...vrTenantIds, ...rfTenantIds, ...leaseTenantIds])]

    const { data: allTenants } = allTenantIds.length > 0
      ? await admin.from('users').select('id, first_name, last_name, phone, email').in('id', allTenantIds)
      : { data: [] as any[] }

    const tenantMap = new Map((allTenants ?? []).map(t => [t.id, t]))

    // Filter visit requests to only TC-verified tenants
    let validatedTenantIds = new Set<string>()
    if (vrTenantIds.length > 0) {
      const { data: validatedRfs } = await admin
        .from('rental_files')
        .select('tenant_id')
        .in('tenant_id', vrTenantIds)
        .eq('status', 'VALIDATED')
      validatedTenantIds = new Set((validatedRfs ?? []).map(r => r.tenant_id))
    }

    // Fetch property images for lease properties
    const leasePropIds = [...new Set((rawActiveLeases ?? []).map(l => l.property_id).filter(Boolean))]
    const leasePropIdsNotInMain = leasePropIds.filter(id => !propertyIds.includes(id))
    let leasePropImgs: any[] = allPropImgs ?? []
    if (leasePropIdsNotInMain.length > 0) {
      const { data: extraImgs } = await admin
        .from('property_images')
        .select('*')
        .in('property_id', leasePropIdsNotInMain)
        .order('order', { ascending: true })
      leasePropImgs = [...(allPropImgs ?? []), ...(extraImgs ?? [])]
    }

    // Build maps
    const propImgMap = groupBy(leasePropImgs, 'property_id')
    const mandatPropMap = new Map((allMandatProps ?? []).map(p => [p.id, p]))
    const mandatOwnerMap = new Map((allMandatOwners ?? []).map(o => [o.id, o]))
    const commissionAgentMap = new Map((allCommissionAgents ?? []).map(a => [a.id, a]))
    const commissionMandatMap = new Map((allCommissionMandats ?? []).map(m => [m.id, m]))
    const assignedByAgent = groupBy(assignedProps ?? [], 'agent_id')
    const commissionByAgent = groupBy(agentCommissions ?? [], 'agent_id')
    const rfLeaseMap = groupBy(rawRentalFiles ?? [], 'id')

    // Fetch lease-property mapping for rental files
    let rfPropertyLeases: any[] = []
    const allRfIds = (rawRentalFiles ?? []).map(f => f.id)
    if (allRfIds.length > 0 && propertyIds.length > 0) {
      const { data: leases } = await admin
        .from('leases')
        .select('id, property_id, rental_file_id')
        .in('rental_file_id', allRfIds)
        .in('property_id', propertyIds)
      rfPropertyLeases = leases ?? []
    }
    const leaseByRentalFile = groupBy(rfPropertyLeases, 'rental_file_id')

    // Fetch lease payments
    const leaseIds = (rawActiveLeases ?? []).map(l => l.id)
    const { data: leasePayments } = leaseIds.length > 0
      ? await admin.from('payments').select('*').in('lease_id', leaseIds).order('due_date', { ascending: true })
      : { data: [] as any[] }
    const paymentByLease = groupBy(leasePayments ?? [], 'lease_id')

    const propMap = new Map((rawProperties ?? []).map(p => [p.id, p]))

    // ─── Map active mandats ────────────────────────────────────────────
    const activeMandats = (rawActiveMandats ?? []).map(m => ({
      id: m.id,
      type: m.type,
      status: m.status,
      commissionRate: m.commission_rate,
      commissionType: m.commission_type,
      fixedCommission: m.fixed_commission,
      startDate: m.start_date,
      endDate: m.end_date,
      conditions: m.conditions,
      ownerSignedAt: m.owner_signed_at,
      agencySignedAt: m.agency_signed_at,
      propertyId: m.property_id,
      ownerId: m.owner_id,
      agencyId: m.agency_id,
      property: mandatPropMap.get(m.property_id) ? {
        id: mandatPropMap.get(m.property_id)!.id,
        title: mandatPropMap.get(m.property_id)!.title,
        city: mandatPropMap.get(m.property_id)!.city,
      } : null,
      owner: mandatOwnerMap.get(m.owner_id) ? {
        id: mandatOwnerMap.get(m.owner_id)!.id,
        firstName: mandatOwnerMap.get(m.owner_id)!.first_name,
        lastName: mandatOwnerMap.get(m.owner_id)!.last_name,
        email: mandatOwnerMap.get(m.owner_id)!.email,
      } : null,
    }))

    // ─── Map agents ────────────────────────────────────────────────────
    const agents = (rawAgents ?? []).map(a => {
      const agentProps = assignedByAgent.get(a.id) ?? []
      const agentComms = commissionByAgent.get(a.id) ?? []
      return {
        id: a.id,
        firstName: a.first_name,
        lastName: a.last_name,
        email: a.email,
        phone: a.phone,
        role: a.role,
        status: a.status,
        avatarUrl: a.avatar_url,
        assignedProperties: agentProps.map((ap: any) => ({
          id: ap.id,
          property: ap.properties ? { id: ap.properties.id, title: ap.properties.title } : null,
        })),
        commissions: agentComms.map((c: any) => ({
          id: c.id,
          amount: c.amount,
          status: c.status,
        })),
      }
    })

    // ─── Map commissions ───────────────────────────────────────────────
    const commissions = (rawCommissions ?? []).map(c => ({
      id: c.id,
      amount: c.amount,
      rate: c.rate,
      status: c.status,
      description: c.description,
      paidAt: c.paid_at,
      createdAt: c.created_at,
      agent: commissionAgentMap.get(c.agent_id) ? {
        id: commissionAgentMap.get(c.agent_id)!.id,
        firstName: commissionAgentMap.get(c.agent_id)!.first_name,
        lastName: commissionAgentMap.get(c.agent_id)!.last_name,
        email: commissionAgentMap.get(c.agent_id)!.email,
      } : null,
      mandat: commissionMandatMap.get(c.mandat_id) ? {
        id: commissionMandatMap.get(c.mandat_id)!.id,
        commissionRate: commissionMandatMap.get(c.mandat_id)!.commission_rate,
        property: (() => {
          const mp = mandatPropMap.get(commissionMandatMap.get(c.mandat_id)!.property_id)
          return mp ? { title: mp.title } : null
        })(),
      } : null,
    }))

    // ─── Map visit requests (filtered) ─────────────────────────────────
    const visitRequests = (rawVisitRequests ?? [])
      .filter(v => validatedTenantIds.has(v.tenant_id))
      .map(v => {
        const tenant = tenantMap.get(v.tenant_id)
        const prop = propMap.get(v.property_id)
        return {
          id: v.id,
          visitType: v.visit_type,
          requestedDate: v.requested_date,
          timeSlot: v.time_slot,
          status: v.status,
          tenantMessage: v.tenant_message,
          createdAt: v.created_at,
          tenant: tenant ? { firstName: tenant.first_name, lastName: tenant.last_name, phone: tenant.phone } : null,
          property: prop ? { title: prop.title, city: prop.city } : null,
        }
      })

    // ─── Map active leases ─────────────────────────────────────────────
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

    // ─── Map rental files (filtered to agency properties) ──────────────
    const agencyRentalFiles = (rawRentalFiles ?? []).filter(rf => {
      const leases = leaseByRentalFile.get(rf.id) ?? []
      return leases.length > 0
    }).map(rf => {
      const tenant = tenantMap.get(rf.tenant_id)
      return {
        id: rf.id,
        status: rf.status,
        tenantCategory: rf.tenant_category,
        createdAt: rf.created_at,
        tenant: tenant ? {
          firstName: tenant.first_name,
          lastName: tenant.last_name,
          phone: tenant.phone,
          email: tenant.email,
        } : null,
      }
    })

    // ─── Map properties ────────────────────────────────────────────────
    const properties = (rawProperties ?? []).map(p => {
      const images = propImgMap.get(p.id) ?? []
      const mandats = (rawActiveMandats ?? []).filter(m => m.property_id === p.id)
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
        viewsCount: p.views_count,
        images: images.map(i => ({
          id: i.id,
          url: i.url,
          order: i.order,
          createdAt: i.created_at,
          propertyId: i.property_id,
        })),
        hasMandat: mandats.length > 0,
      }
    })

    // ─── Map all mandats ───────────────────────────────────────────────
    const allMandats = (rawAllMandats ?? []).map(m => ({
      id: m.id,
      type: m.type,
      status: m.status,
      commissionRate: m.commission_rate,
      commissionType: m.commission_type,
      fixedCommission: m.fixed_commission,
      startDate: m.start_date,
      endDate: m.end_date,
      conditions: m.conditions,
      ownerSignedAt: m.owner_signed_at,
      agencySignedAt: m.agency_signed_at,
      property: mandatPropMap.get(m.property_id) ? {
        id: mandatPropMap.get(m.property_id)!.id,
        title: mandatPropMap.get(m.property_id)!.title,
        city: mandatPropMap.get(m.property_id)!.city,
      } : null,
      owner: mandatOwnerMap.get(m.owner_id) ? {
        id: mandatOwnerMap.get(m.owner_id)!.id,
        firstName: mandatOwnerMap.get(m.owner_id)!.first_name,
        lastName: mandatOwnerMap.get(m.owner_id)!.last_name,
        email: mandatOwnerMap.get(m.owner_id)!.email,
      } : null,
    }))

    // ─── Signalements ──────────────────────────────────────────────────
    const signalements = (rawSignalements ?? []).map(s => ({
      id: s.id,
      reporterId: s.reporter_id,
      status: s.status,
      createdAt: s.created_at,
    }))

    // ─── Agent stats ───────────────────────────────────────────────────
    const agentStats = agents.map(agent => ({
      id: agent.id,
      firstName: agent.firstName,
      lastName: agent.lastName,
      email: agent.email,
      phone: agent.phone,
      role: agent.role,
      status: agent.status,
      avatarUrl: agent.avatarUrl,
      assignedPropertiesCount: agent.assignedProperties.length,
      totalCommissions: agent.commissions.reduce((sum: number, c: any) => sum + c.amount, 0),
    }))

    // ─── Stats ─────────────────────────────────────────────────────────
    const activeLeaseList = activeLeases.filter(l => l.status === 'ACTIVE')
    const totalRevenue = activeLeaseList.reduce((sum, l) => sum + l.monthlyRent, 0)
    const totalCommissions = commissions.reduce((sum, c) => sum + c.amount, 0)
    const paidCommissions = commissions.filter(c => c.status === 'PAID').reduce((sum, c) => sum + c.amount, 0)
    const pendingCommissions = commissions.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + c.amount, 0)
    const pendingVisits = visitRequests.filter(v => v.status === 'PENDING').length

    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const expiringMandats = allMandats.filter(
      m => m.status === 'ACTIVE' && m.endDate && new Date(m.endDate) <= thirtyDaysFromNow
    )

    const latePaymentsCount = activeLeaseList.reduce((sum, l) => {
      return sum + (l.payments?.filter((p: any) => p.status === 'LATE').length ?? 0)
    }, 0)

    const resp = NextResponse.json({
      stats: {
        totalProperties: properties.length,
        activeProperties: properties.filter(p => p.status === 'ACTIVE').length,
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
      properties,
      allMandats,
      visitRequests,
      activeLeases,
      rentalFiles: agencyRentalFiles,
      agents: agentStats,
      commissions,
      signalements,
      expiringMandats: expiringMandats.map(m => ({
        id: m.id,
        endDate: m.endDate,
        property: m.property,
        owner: m.owner,
      })),
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Agence dashboard error:', error)
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
