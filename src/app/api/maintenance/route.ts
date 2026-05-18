import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify } from '@/lib/notify'

export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const { data: profile } = await (supabase
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single())
    const effectiveRole = profile?.active_role || profile?.role

    if (effectiveRole !== 'LOCATAIRE' && effectiveRole !== 'PROPRIETAIRE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const status = searchParams.get('status') || undefined
    const priority = searchParams.get('priority') || undefined
    const leaseIdParam = searchParams.get('leaseId') || undefined

    let ownerLeaseIds: string[] = []
    if (effectiveRole === 'PROPRIETAIRE') {
      const { data: ownerLeases } = await (supabase
        .from('leases')
        .select('id')
        .eq('owner_id', userId))
      ownerLeaseIds = (ownerLeases ?? []).map((l: any) => l.id)
    }

    let query = supabase.from('maintenance_requests').select('*', { count: 'exact' })

    if (effectiveRole === 'PROPRIETAIRE') {
      if (ownerLeaseIds.length > 0) {
        query = query.in('lease_id', ownerLeaseIds)
      } else {
        query = query.eq('lease_id', '__nonexistent__')
      }
    } else {
      query = query.eq('tenant_id', userId)
    }

    if (status) query = query.eq('status', status)
    if (priority) query = query.eq('priority', priority)
    if (leaseIdParam) query = query.eq('lease_id', leaseIdParam)

    query = query.order('created_at', { ascending: false }).range((page - 1) * limit, page * limit - 1)

    const { data: requests, count: total } = await (query)

    const leaseIds = [...new Set((requests ?? []).map((r: any) => r.lease_id).filter(Boolean))]
    let leaseMap: Record<string, any> = {}

    if (leaseIds.length > 0) {
      const { data: leases } = await (supabase
        .from('leases')
        .select('id, start_date, end_date, monthly_rent, property_id, owner_id')
        .in('id', leaseIds))

      const propIds = [...new Set((leases ?? []).map((l: any) => l.property_id).filter(Boolean))]
      let propertyMap: Record<string, any> = {}

      if (propIds.length > 0) {
        const { data: properties } = await (supabase
          .from('properties')
          .select('id, title, address, city')
          .in('id', propIds))

        const { data: propertyImages } = await (supabase
          .from('property_images')
          .select('url, property_id')
          .in('property_id', propIds)
          .order('order', { ascending: true }))

        const imgMap: Record<string, any[]> = {}
        for (const img of propertyImages ?? []) {
          if (!imgMap[img.property_id]) imgMap[img.property_id] = []
          imgMap[img.property_id].push(img)
        }

        for (const prop of properties ?? []) {
          propertyMap[prop.id] = {
            id: prop.id,
            title: prop.title,
            address: prop.address,
            city: prop.city,
            images: (imgMap[prop.id] ?? []).slice(0, 1).map((i: any) => ({ url: i.url })),
          }
        }
      }

      const ownerIds = [...new Set((leases ?? []).map((l: any) => l.owner_id).filter(Boolean))]
      let ownerMap: Record<string, any> = {}
      if (ownerIds.length > 0) {
        const { data: owners } = await (supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', ownerIds))
        for (const o of owners ?? []) {
          ownerMap[o.id] = { id: o.id, firstName: o.first_name, lastName: o.last_name }
        }
      }

      for (const lease of leases ?? []) {
        leaseMap[lease.id] = {
          id: lease.id,
          startDate: lease.start_date,
          endDate: lease.end_date,
          monthlyRent: lease.monthly_rent,
          property: propertyMap[lease.property_id] || null,
          owner: ownerMap[lease.owner_id] || null,
        }
      }
    }

    const data = (requests ?? []).map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      status: r.status,
      priority: r.priority,
      images: r.images,
      resolution: r.resolution,
      leaseId: r.lease_id,
      tenantId: r.tenant_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      lease: leaseMap[r.lease_id] || null,
    }))

    // Status counts
    let statsQuery = supabase.from('maintenance_requests').select('status')
    if (effectiveRole === 'PROPRIETAIRE') {
      if (ownerLeaseIds.length > 0) {
        statsQuery = statsQuery.in('lease_id', ownerLeaseIds)
      } else {
        statsQuery = statsQuery.eq('lease_id', '__nonexistent__')
      }
    } else {
      statsQuery = statsQuery.eq('tenant_id', userId)
    }
    const { data: statusData } = await (statsQuery)
    const rawStatuses = (statusData ?? []) as any[]
    const stats: Record<string, number> = {}
    for (const r of rawStatuses) {
      stats[r.status] = (stats[r.status] || 0) + 1
    }

    const resp = NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: total ?? 0,
        totalPages: Math.ceil((total ?? 0) / limit),
      },
      stats,
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('Maintenance GET error:', error)
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

    const { data: profile } = await (supabase
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single())
    const effectiveRole = profile?.active_role || profile?.role

    if (effectiveRole !== 'LOCATAIRE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await req.json()
    const { leaseId, title, description, priority, images } = body as {
      leaseId?: string
      title?: string
      description?: string
      priority?: string
      images?: string[]
    }

    if (!leaseId || !title || !description) {
      return NextResponse.json(
        { error: 'leaseId, title et description sont requis' },
        { status: 400 }
      )
    }

    const { data: lease } = await (supabase
      .from('leases')
      .select('id')
      .eq('id', leaseId)
      .eq('tenant_id', userId)
      .maybeSingle())

    if (!lease) {
      return NextResponse.json(
        { error: 'Bail introuvable ou accès refusé' },
        { status: 404 }
      )
    }

    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
    const resolvedPriority = validPriorities.includes(priority || '') ? priority : 'MEDIUM'

    let resolvedImages: string[] = []
    if (Array.isArray(images)) {
      resolvedImages = images.filter((img) => typeof img === 'string').slice(0, 5)
    }

    const { data: insertedMR } = await (supabase
      .from('maintenance_requests')
      .insert({
        title,
        description,
        priority: resolvedPriority,
        images: JSON.stringify(resolvedImages),
        lease_id: leaseId,
        tenant_id: userId,
      } as any)
      .select('id, title, description, status, priority, images, lease_id, tenant_id, created_at, updated_at')
      .single())
    const maintenanceRequest = insertedMR as any

    await supabase.from('audit_logs').insert({
      action: 'CREATE',
      entity: 'MaintenanceRequest',
      entity_id: maintenanceRequest.id,
      details: `Demande de maintenance créée: ${title}${resolvedImages.length > 0 ? ` (${resolvedImages.length} photo(s))` : ''}`,
      user_id: userId,
    })

    const { data: ownerNotifRaw } = await (supabase
      .from('leases')
      .select('owner_id, property:properties(title)')
      .eq('id', leaseId)
      .single())
    const ownerNotif = ownerNotifRaw as any

    if (ownerNotif) {
      await notify({
        userId: ownerNotif.owner_id,
        type: 'MAINTENANCE',
        title: 'Nouvelle demande de maintenance',
        message: `Une demande de maintenance a été soumise pour "${ownerNotif.property?.title}": ${title}`,
        actionUrl: 'maintenance',
        entityId: maintenanceRequest.id,
      })
    }

    // Enrich with lease -> property -> first image
    let leaseData: any = { id: leaseId }
    const { data: leaseInfo } = await (supabase
      .from('leases')
      .select('id, property_id')
      .eq('id', leaseId)
      .single())
    if (leaseInfo) {
      const { data: property } = await (supabase
        .from('properties')
        .select('id, title, address, city')
        .eq('id', leaseInfo.property_id)
        .single())
      if (property) {
        const { data: propImages } = await (supabase
          .from('property_images')
          .select('url')
          .eq('property_id', property.id)
          .order('order', { ascending: true })
          .limit(1))
        leaseData = {
          id: leaseId,
          property: {
            id: property.id,
            title: property.title,
            address: property.address,
            city: property.city,
            images: (propImages ?? []).map((i: any) => ({ url: i.url })),
          },
        }
      }
    }

    const resp = NextResponse.json({
      data: {
        id: maintenanceRequest.id,
        title: maintenanceRequest.title,
        description: maintenanceRequest.description,
        status: maintenanceRequest.status,
        priority: maintenanceRequest.priority,
        images: maintenanceRequest.images,
        leaseId: maintenanceRequest.lease_id,
        tenantId: maintenanceRequest.tenant_id,
        createdAt: maintenanceRequest.created_at,
        updatedAt: maintenanceRequest.updated_at,
        lease: leaseData,
      },
    }, { status: 201 })
    return applyCookies(resp)
  } catch (error) {
    console.error('Maintenance POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
