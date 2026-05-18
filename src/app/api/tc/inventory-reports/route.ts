import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

const VALID_INVENTORY_TYPES = ['INVENTORY_ENTRANCE', 'INVENTORY_EXIT'] as const
const VALID_INVENTORY_STATUSES = ['DRAFT', 'COMPLETED', 'SIGNED_OWNER', 'SIGNED_TENANT', 'SIGNED_BOTH'] as const
const VALID_ROOM_CONDITIONS = ['BON', 'MAUVAIS'] as const

export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const { data: profile } = await ((supabase as any)
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single() as any)
    const effectiveRole = profile?.active_role || profile?.role

    const { searchParams } = new URL(req.url)
    const propertyId = searchParams.get('propertyId')
    const leaseId = searchParams.get('leaseId')
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')

    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 20
    const offset = offsetParam ? parseInt(offsetParam) : 0

    let query = supabase
      .from('inventory_reports')
      .select('*', { count: 'exact' })

    if (propertyId) query = query.eq('property_id', propertyId)
    if (leaseId) query = query.eq('lease_id', leaseId)
    if (type && VALID_INVENTORY_TYPES.includes(type as typeof VALID_INVENTORY_TYPES[number])) {
      query = query.eq('type', type)
    }
    if (status && VALID_INVENTORY_STATUSES.includes(status as typeof VALID_INVENTORY_STATUSES[number])) {
      query = query.eq('status', status)
    }

    if (effectiveRole !== 'TIERS_CONFIANCE' && effectiveRole !== 'ADMIN') {
      const { data: userOwnedProperties } = await ((supabase as any)
        .from('properties')
        .select('id')
        .eq('owner_id', userId))
      const { data: userLeases } = await ((supabase as any)
        .from('leases')
        .select('id')
        .eq('tenant_id', userId))

      const ownerPropIds = (userOwnedProperties ?? []).map((p: any) => p.id)
      const tenantLeaseIds = (userLeases ?? []).map((l: any) => l.id)

      const orConditions: string[] = []
      if (ownerPropIds.length > 0) orConditions.push(`property_id.in.(${ownerPropIds.join(',')})`)
      if (tenantLeaseIds.length > 0) orConditions.push(`lease_id.in.(${tenantLeaseIds.join(',')})`)
      if (orConditions.length > 0) query = query.or(orConditions.join(','))
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: reportsData, count: total } = await (query as any)
    const reports = (reportsData ?? []) as any[]

    const propIds = [...new Set(reports.map((r: any) => r.property_id).filter(Boolean))]
    const leaseIds = [...new Set(reports.map((r: any) => r.lease_id).filter(Boolean))]
    const reportIds = reports.map((r: any) => r.id)

    const [{ data: propertiesData }, { data: leasesData }, { data: itemsData }] = await Promise.all([
      propIds.length > 0
        ? (supabase.from('properties') as any).select('id, title, address, city, commune').in('id', propIds) as any
        : Promise.resolve({ data: [] as any[], error: null }),
      leaseIds.length > 0
        ? (supabase.from('leases') as any).select('*, tenant:users!tenant_id(id, first_name, last_name), owner:users!owner_id(id, first_name, last_name)').in('id', leaseIds) as any
        : Promise.resolve({ data: [] as any[], error: null }),
      reportIds.length > 0
        ? (supabase.from('inventory_report_items') as any).select('*').in('report_id', reportIds).order('designation_order', { ascending: true }) as any
        : Promise.resolve({ data: [] as any[], error: null }),
    ])

    const propMap = new Map<string, any>((propertiesData ?? []).map((p: any) => [p.id, p]))
    const leaseMap = new Map<string, any>((leasesData ?? []).map((l: any) => [l.id, l]))
    const itemsByReport = new Map<string, any[]>()
    for (const item of (itemsData ?? []) as any[]) {
      if (!itemsByReport.has(item.report_id)) itemsByReport.set(item.report_id, [])
      itemsByReport.get(item.report_id)!.push(item)
    }

    const enrichedReports = reports.map((r: any) => {
      const lease = leaseMap.get(r.lease_id)
      const items = (itemsByReport.get(r.id) ?? []).map((item: any) => ({
        id: item.id,
        reportId: item.report_id,
        designation: item.designation,
        designationOrder: item.designation_order,
        kitchen: item.kitchen,
        mainBathroom: item.main_bathroom,
        otherBathroom: item.other_bathroom,
        otherRoom1: item.other_room_1,
        otherRoom2: item.other_room_2,
        observations: item.observations,
        createdAt: item.created_at,
      }))

      return {
        id: r.id,
        propertyId: r.property_id,
        type: r.type,
        leaseId: r.lease_id,
        status: r.status,
        generalObservations: r.general_observations,
        totalKeys: r.total_keys,
        reviewerId: r.reviewer_id,
        completedAt: r.completed_at,
        ownerSignedAt: r.owner_signed_at,
        tenantSignedAt: r.tenant_signed_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        property: propMap.get(r.property_id) ? {
          id: propMap.get(r.property_id).id,
          title: propMap.get(r.property_id).title,
          address: propMap.get(r.property_id).address,
          city: propMap.get(r.property_id).city,
          commune: propMap.get(r.property_id).commune,
        } : null,
        lease: lease ? {
          id: lease.id,
          startDate: lease.start_date,
          endDate: lease.end_date,
          tenant: lease.tenant ? {
            id: lease.tenant.id,
            firstName: lease.tenant.first_name,
            lastName: lease.tenant.last_name,
          } : null,
          owner: lease.owner ? {
            id: lease.owner.id,
            firstName: lease.owner.first_name,
            lastName: lease.owner.last_name,
          } : null,
        } : null,
        items,
      }
    })

    const resp = NextResponse.json({
      reports: enrichedReports,
      pagination: {
        total: total ?? 0,
        limit,
        offset,
        hasMore: offset + limit < (total ?? 0),
      },
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Inventory reports GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const { data: profile } = await ((supabase as any)
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single() as any)
    const effectiveRole = profile?.active_role || profile?.role

    if (effectiveRole !== 'TIERS_CONFIANCE') {
      return NextResponse.json(
        { error: 'Accès refusé — rôle TIERS_CONFIANCE requis' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { propertyId, type, leaseId, items, generalObservations, totalKeys, status: requestedStatus } = body

    if (!propertyId || typeof propertyId !== 'string') {
      return NextResponse.json({ error: 'propertyId est requis' }, { status: 400 })
    }
    if (!type || !VALID_INVENTORY_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `type doit être l'un des suivants : ${VALID_INVENTORY_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    const { data: property } = await ((supabase as any)
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .single() as any)
    if (!property) {
      return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    }

    if (leaseId) {
      const { data: lease } = await ((supabase as any)
        .from('leases')
        .select('id')
        .eq('id', leaseId)
        .single() as any)
      if (!lease) {
        return NextResponse.json({ error: 'Bail introuvable' }, { status: 404 })
      }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Au moins un élément est requis' }, { status: 400 })
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item.designation || typeof item.designation !== 'string') {
        return NextResponse.json(
          { error: `Élément ${i + 1} : la désignation est requise` },
          { status: 400 }
        )
      }
      const conditionFields = ['kitchen', 'mainBathroom', 'otherBathroom', 'otherRoom1', 'otherRoom2'] as const
      for (const field of conditionFields) {
        if (item[field] !== undefined && item[field] !== null && !VALID_ROOM_CONDITIONS.includes(item[field])) {
          return NextResponse.json(
            { error: `Élément ${i + 1} : ${field} doit être BON ou MAUVAIS` },
            { status: 400 }
          )
        }
      }
    }

    const reportStatus = (requestedStatus && VALID_INVENTORY_STATUSES.includes(requestedStatus)) ? requestedStatus : 'DRAFT'

    const { data: report } = await ((supabase as any)
      .from('inventory_reports')
      .insert({
        property_id: propertyId,
        type,
        lease_id: leaseId || null,
        general_observations: generalObservations || null,
        total_keys: totalKeys !== undefined ? Number(totalKeys) : null,
        reviewer_id: userId,
        status: reportStatus,
        completed_at: reportStatus === 'COMPLETED' ? new Date().toISOString() : null,
      })
      .select()
      .single() as any)

    const inventoryItems = items.map((item: any, index: number) => ({
      report_id: report.id,
      designation: item.designation,
      designation_order: item.designationOrder !== undefined ? Number(item.designationOrder) : index + 1,
      kitchen: item.kitchen || null,
      main_bathroom: item.mainBathroom || null,
      other_bathroom: item.otherBathroom || null,
      other_room_1: item.otherRoom1 || null,
      other_room_2: item.otherRoom2 || null,
      observations: item.observations || null,
    }))

    const { data: createdItems } = await ((supabase as any)
      .from('inventory_report_items')
      .insert(inventoryItems)
      .select()
      .order('designation_order', { ascending: true }))

    await (supabase.from('audit_logs') as any).insert({
      action: 'INVENTORY_REPORT_CREATED',
      entity: 'InventoryReport',
      entity_id: report.id,
      details: JSON.stringify({ propertyId, type, itemCount: items.length }),
      user_id: userId,
    })

    const mappedItems = (createdItems ?? []).map((item: any) => ({
      id: item.id,
      reportId: item.report_id,
      designation: item.designation,
      designationOrder: item.designation_order,
      kitchen: item.kitchen,
      mainBathroom: item.main_bathroom,
      otherBathroom: item.other_bathroom,
      otherRoom1: item.other_room_1,
      otherRoom2: item.other_room_2,
      observations: item.observations,
    }))

    const mappedReport = {
      ...report,
      propertyId: report.property_id,
      leaseId: report.lease_id,
      generalObservations: report.general_observations,
      totalKeys: report.total_keys,
      reviewerId: report.reviewer_id,
      completedAt: report.completed_at,
      ownerSignedAt: report.owner_signed_at,
      tenantSignedAt: report.tenant_signed_at,
      createdAt: report.created_at,
      updatedAt: report.updated_at,
      items: mappedItems,
    }

    const resp = NextResponse.json({ report: mappedReport }, { status: 201 })
    return applyCookies(resp)
  } catch (error) {
    console.error('Inventory reports POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const { data: profile } = await ((supabase as any)
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single() as any)
    const effectiveRole = profile?.active_role || profile?.role

    const body = await req.json()
    const { reportId, items, generalObservations, totalKeys, status, ownerSigned, tenantSigned } = body

    if (!reportId || typeof reportId !== 'string') {
      return NextResponse.json({ error: 'reportId est requis' }, { status: 400 })
    }

    const { data: report } = await ((supabase as any)
      .from('inventory_reports')
      .select('*, property:properties(owner_id), lease:leases(tenant_id)')
      .eq('id', reportId)
      .single() as any)

    if (!report) {
      return NextResponse.json({ error: 'Rapport introuvable' }, { status: 404 })
    }

    const isTC = effectiveRole === 'TIERS_CONFIANCE'
    const isOwner = report.property?.owner_id === userId
    const isTenant = report.lease?.tenant_id === userId

    const updateData: Record<string, unknown> = {}

    if (isTC) {
      if (items !== undefined) {
        if (!Array.isArray(items)) {
          return NextResponse.json({ error: 'items doit être un tableau' }, { status: 400 })
        }

        await (supabase.from('inventory_report_items') as any).delete().eq('report_id', reportId)

        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          if (!item.designation || typeof item.designation !== 'string') {
            return NextResponse.json(
              { error: `Élément ${i + 1} : la désignation est requise` },
              { status: 400 }
            )
          }
          const conditionFields = ['kitchen', 'mainBathroom', 'otherBathroom', 'otherRoom1', 'otherRoom2'] as const
          for (const field of conditionFields) {
            if (item[field] !== undefined && item[field] !== null && !VALID_ROOM_CONDITIONS.includes(item[field])) {
              return NextResponse.json(
                { error: `Élément ${i + 1} : ${field} doit être BON ou MAUVAIS` },
                { status: 400 }
              )
            }
          }
        }

        const newItems = items.map((item: any, index: number) => ({
          report_id: reportId,
          designation: item.designation,
          designation_order: item.designationOrder !== undefined ? Number(item.designationOrder) : index + 1,
          kitchen: item.kitchen || null,
          main_bathroom: item.mainBathroom || null,
          other_bathroom: item.otherBathroom || null,
          other_room_1: item.otherRoom1 || null,
          other_room_2: item.otherRoom2 || null,
          observations: item.observations || null,
        }))

        await (supabase.from('inventory_report_items') as any).insert(newItems)
      }

      if (generalObservations !== undefined) {
        updateData.general_observations = generalObservations
      }
      if (totalKeys !== undefined) {
        updateData.total_keys = Number(totalKeys)
      }
    }

    if (status !== undefined) {
      if (!VALID_INVENTORY_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: `status doit être l'un des suivants : ${VALID_INVENTORY_STATUSES.join(', ')}` },
          { status: 400 }
        )
      }
      if (!isTC && status !== 'SIGNED_OWNER' && status !== 'SIGNED_TENANT') {
        return NextResponse.json(
          { error: 'Seul un TC peut modifier le statut du rapport' },
          { status: 403 }
        )
      }
      updateData.status = status
    }

    if (ownerSigned === true) {
      if (!isOwner && !isTC) {
        return NextResponse.json(
          { error: 'Seul le propriétaire ou un TC peut signer pour le propriétaire' },
          { status: 403 }
        )
      }
      updateData.owner_signed_at = new Date().toISOString()
      if (report.tenant_signed_at) {
        updateData.status = 'SIGNED_BOTH'
      } else {
        updateData.status = 'SIGNED_OWNER'
      }
    }

    if (tenantSigned === true) {
      if (!isTenant && !isTC) {
        return NextResponse.json(
          { error: 'Seul le locataire ou un TC peut signer pour le locataire' },
          { status: 403 }
        )
      }
      updateData.tenant_signed_at = new Date().toISOString()
      if (report.owner_signed_at) {
        updateData.status = 'SIGNED_BOTH'
      } else {
        updateData.status = 'SIGNED_TENANT'
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Aucune donnée à mettre à jour' }, { status: 400 })
    }

    const { data: updatedReport } = await ((supabase as any)
      .from('inventory_reports')
      .update(updateData as any)
      .eq('id', reportId)
      .select()
      .single() as any)

    const { data: refreshedItems } = await ((supabase as any)
      .from('inventory_report_items')
      .select('*')
      .eq('report_id', reportId)
      .order('designation_order', { ascending: true }))

    await (supabase.from('audit_logs') as any).insert({
      action: 'INVENTORY_REPORT_UPDATED',
      entity: 'InventoryReport',
      entity_id: reportId,
      details: JSON.stringify({
        updatedFields: Object.keys(updateData),
        userId,
      }),
      user_id: userId,
    })

    const mappedItems = (refreshedItems ?? []).map((item: any) => ({
      id: item.id,
      reportId: item.report_id,
      designation: item.designation,
      designationOrder: item.designation_order,
      kitchen: item.kitchen,
      mainBathroom: item.main_bathroom,
      otherBathroom: item.other_bathroom,
      otherRoom1: item.other_room_1,
      otherRoom2: item.other_room_2,
      observations: item.observations,
    }))

    const mappedResult = {
      ...updatedReport,
      propertyId: updatedReport.property_id,
      leaseId: updatedReport.lease_id,
      generalObservations: updatedReport.general_observations,
      totalKeys: updatedReport.total_keys,
      reviewerId: updatedReport.reviewer_id,
      completedAt: updatedReport.completed_at,
      ownerSignedAt: updatedReport.owner_signed_at,
      tenantSignedAt: updatedReport.tenant_signed_at,
      createdAt: updatedReport.created_at,
      updatedAt: updatedReport.updated_at,
      items: mappedItems,
    }

    const resp = NextResponse.json({ report: mappedResult })
    return applyCookies(resp)
  } catch (error) {
    console.error('Inventory reports PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
