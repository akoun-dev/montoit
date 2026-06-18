import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify } from '@/lib/notify'

function generateId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

async function getUserRole(admin: ReturnType<typeof getSupabaseAdminClient>, userId: string): Promise<string | null> {
  const { data } = await admin
    .from('users')
    .select('role, active_role')
    .eq('id', userId)
    .single()
  if (!data) return null
  return data.active_role || data.role
}

// GET /api/visits — List visit requests for the current user
export async function GET(req: NextRequest) {
  try {
    const auth = await resolveRequestUser(req)
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const userId = auth.userId

    const admin = getSupabaseAdminClient()
    const role = await getUserRole(admin, userId)
    if (!role) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    let propertyIds: string[] | null = null
    let validatedTenantIds: string[] | null = null

    if (role === 'PROPRIETAIRE' || role === 'AGENCE') {
      const { data: validatedTenants } = await admin
        .from('rental_files')
        .select('tenant_id')
        .in('status', ['VALIDATED', 'ACCEPTED'])
      validatedTenantIds = validatedTenants?.map((r) => r.tenant_id) ?? []

      if (validatedTenantIds.length === 0) {
        return NextResponse.json({ data: [] })
      }

      if (role === 'PROPRIETAIRE') {
        const { data: properties } = await admin
          .from('properties')
          .select('id')
          .eq('owner_id', userId)
        propertyIds = properties?.map((p) => p.id) ?? []

        if (propertyIds.length === 0) {
          return NextResponse.json({ data: [] })
        }
      } else if (role === 'AGENCE') {
        const { data: mandats } = await admin
          .from('mandats')
          .select('property_id')
          .eq('agency_id', userId)
          .eq('status', 'ACTIVE')
        propertyIds = mandats?.map((m) => m.property_id) ?? []

        if (propertyIds.length === 0) {
          return NextResponse.json({ data: [] })
        }
      }
    }

    let query = admin
      .from('visit_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (role === 'LOCATAIRE') {
      query = query.eq('tenant_id', userId)
    } else if (propertyIds) {
      query = query.in('property_id', propertyIds).in('tenant_id', validatedTenantIds!)
    }

    const { data: visits, error } = await query

    if (error) {
      console.error('Visits GET error:', error)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    const enrichedVisits = await enrichVisits(admin, visits ?? [])

    return NextResponse.json({ data: enrichedVisits })
  } catch (error) {
    console.error('Visits GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/visits — Create a visit request
export async function POST(req: NextRequest) {
  try {
    const auth = await resolveRequestUser(req)
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const userId = auth.userId

    const admin = getSupabaseAdminClient()
    const role = await getUserRole(admin, userId)
    if (!role) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    if (role !== 'LOCATAIRE') {
      return NextResponse.json({ error: 'Seuls les locataires peuvent demander des visites' }, { status: 403 })
    }

    const body = await req.json()
    const { propertyId, visitType, requestedDate, timeSlot, tenantMessage } = body

    if (!propertyId || !requestedDate || !timeSlot) {
      return NextResponse.json({ error: 'propertyId, requestedDate et timeSlot sont requis' }, { status: 400 })
    }

    const { data: property } = await admin
      .from('properties')
      .select('id, rental_status')
      .eq('id', propertyId)
      .single()

    if (!property) {
      return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
    }

    if (property.rental_status === 'loue') {
      return NextResponse.json({ error: 'Ce bien est déjà loué' }, { status: 400 })
    }

    const { data: existingVisit } = await admin
      .from('visit_requests')
      .select('id')
      .eq('property_id', propertyId)
      .eq('tenant_id', userId)
      .eq('status', 'PENDING')
      .maybeSingle()

    if (existingVisit) {
      return NextResponse.json({ error: 'Vous avez déjà une demande de visite en attente pour ce bien' }, { status: 409 })
    }

    const visitId = generateId()

    const { data: visit, error } = await admin
      .from('visit_requests')
      .insert({
        id: visitId,
        property_id: propertyId,
        tenant_id: userId,
        visit_type: visitType || 'PHYSICAL',
        requested_date: new Date(requestedDate).toISOString(),
        time_slot: timeSlot,
        tenant_message: tenantMessage || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Visit request POST error:', error)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    const { data: propInfo } = await admin
      .from('properties')
      .select('title, owner_id')
      .eq('id', propertyId)
      .single()

    const { data: tenantInfo } = await admin
      .from('users')
      .select('first_name, last_name')
      .eq('id', userId)
      .single()

    // Notify the owner/agency ONLY if the tenant's rental file is validated
    const { data: validatedRentalFile } = await admin
      .from('rental_files')
      .select('id')
      .eq('tenant_id', userId)
      .in('status', ['VALIDATED', 'ACCEPTED'])
      .maybeSingle()

    if (validatedRentalFile) {
      const ownerId = propInfo?.owner_id
      const tenantName = tenantInfo ? `${tenantInfo.first_name} ${tenantInfo.last_name}` : ''

      if (ownerId) {
        await notify({
          userId: ownerId,
          type: 'VISIT_REMINDER',
          title: 'Nouvelle demande de visite',
          message: `${tenantName} souhaite visiter "${propInfo?.title || ''}".`,
          actionUrl: 'visit-requests',
          entityId: visitId,
        })
      }

      const { data: mandats } = await admin
        .from('mandats')
        .select('agency_id')
        .eq('property_id', propertyId)
        .eq('status', 'ACTIVE')

      for (const mandat of mandats ?? []) {
        if (mandat.agency_id !== ownerId) {
          await notify({
            userId: mandat.agency_id,
            type: 'VISIT_REMINDER',
            title: 'Nouvelle demande de visite',
            message: `${tenantName} souhaite visiter "${propInfo?.title || ''}".`,
            actionUrl: 'visits',
            entityId: visitId,
          })
        }
      }
    }

    const enrichedVisit = await enrichVisit(admin, visit)

    return NextResponse.json({ data: enrichedVisit }, { status: 201 })
  } catch (error) {
    console.error('Visit request POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

async function enrichVisits(admin: ReturnType<typeof getSupabaseAdminClient>, visits: any[]) {
  const propertyIds = [...new Set(visits.map((v) => v.property_id))]
  const tenantIds = [...new Set(visits.map((v) => v.tenant_id))]

  const { data: properties } = await admin
    .from('properties')
    .select('id, title, address, city, type, price, currency')
    .in('id', propertyIds)

  const { data: propertyImages } = await admin
    .from('property_images')
    .select('property_id, url')
    .in('property_id', propertyIds)
    .order('order', { ascending: true })

  const { data: tenants } = await admin
    .from('users')
    .select('id, first_name, last_name, phone, email')
    .in('id', tenantIds)

  const propMap = new Map(properties?.map((p) => [p.id, p]))
  const imgMap = new Map<string, string[]>()
  for (const img of propertyImages ?? []) {
    const arr = imgMap.get(img.property_id) ?? []
    arr.push(img.url)
    imgMap.set(img.property_id, arr)
  }
  const tenantMap = new Map(tenants?.map((t) => [t.id, t]))

  return visits.map((v) => ({
    id: v.id,
    visitType: v.visit_type,
    requestedDate: v.requested_date,
    timeSlot: v.time_slot,
    status: v.status,
    counterDate: v.counter_date,
    counterTimeSlot: v.counter_time_slot,
    ownerComment: v.owner_comment,
    tenantMessage: v.tenant_message,
    createdAt: v.created_at,
    updatedAt: v.updated_at,
    propertyId: v.property_id,
    tenantId: v.tenant_id,
    property: (() => {
      const p = propMap.get(v.property_id)
      if (!p) return undefined
      const images = imgMap.get(v.property_id) ?? []
      return {
        id: p.id,
        title: p.title,
        address: p.address,
        city: p.city,
        type: p.type,
        price: p.price,
        currency: p.currency,
        images: images.slice(0, 1).map((url) => ({ url })),
      }
    })(),
    tenant: (() => {
      const t = tenantMap.get(v.tenant_id)
      if (!t) return undefined
      return {
        id: t.id,
        firstName: t.first_name,
        lastName: t.last_name,
        phone: t.phone,
        email: t.email,
      }
    })(),
  }))
}

async function enrichVisit(admin: ReturnType<typeof getSupabaseAdminClient>, visit: any) {
  const enriched = await enrichVisits(admin, [visit])
  return enriched[0] ?? visit
}
