import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify } from '@/lib/notify'

export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return applyCookies(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }))
    }

    const admin = getSupabaseAdminClient()

    const { data: user } = await admin
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single()

    if (!user) {
      return applyCookies(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }))
    }

    const effectiveRole = user.active_role || user.role

    if (effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE') {
      return applyCookies(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }))
    }

    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status')

    let query = admin.from('mandats').select('*')

    if (effectiveRole === 'PROPRIETAIRE') {
      query = query.eq('owner_id', userId)
    } else {
      query = query.eq('agency_id', userId)
    }

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    query = query.order('created_at', { ascending: false })

    const { data: mandats, error } = await query

    if (error) {
      console.error('List mandats error:', error)
      return applyCookies(NextResponse.json({ error: 'Erreur serveur' }, { status: 500 }))
    }

    const enriched = await enrichMandats(admin, mandats ?? [])

    return applyCookies(NextResponse.json({ mandats: enriched }))
  } catch (error) {
    console.error('List mandats error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return applyCookies(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }))
    }

    const admin = getSupabaseAdminClient()

    const { data: user } = await admin
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single()

    if (!user) {
      return applyCookies(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }))
    }

    const effectiveRole = user.active_role || user.role

    if (effectiveRole !== 'PROPRIETAIRE') {
      return applyCookies(NextResponse.json({ error: 'Seul un propriétaire peut créer un mandat' }, { status: 403 }))
    }

    const body = await req.json()
    const { propertyId, agencyId, type, commissionRate, startDate, endDate, conditions } = body

    if (!propertyId || !agencyId || !type || commissionRate === undefined || !startDate || !endDate) {
      return applyCookies(
        NextResponse.json(
          { error: 'Champs requis manquants : propertyId, agencyId, type, commissionRate, startDate, endDate' },
          { status: 400 }
        )
      )
    }

    const validTypes = ['GESTION_COMPLETE', 'GESTION_LOCATION', 'MANDAT_SIMPLE']
    if (!validTypes.includes(type)) {
      return applyCookies(
        NextResponse.json(
          { error: `Type invalide. Valeurs acceptées : ${validTypes.join(', ')}` },
          { status: 400 }
        )
      )
    }

    const { data: property } = await admin
      .from('properties')
      .select('id, owner_id, title')
      .eq('id', propertyId)
      .single()

    if (!property) {
      return applyCookies(NextResponse.json({ error: 'Propriété introuvable' }, { status: 404 }))
    }

    if (property.owner_id !== userId) {
      return applyCookies(NextResponse.json({ error: 'Cette propriété ne vous appartient pas' }, { status: 403 }))
    }

    const { data: agency } = await admin
      .from('users')
      .select('id, role, active_role')
      .eq('id', agencyId)
      .single()

    if (!agency || (agency.role !== 'AGENCE' && agency.active_role !== 'AGENCE')) {
      return applyCookies(NextResponse.json({ error: 'Agence introuvable ou invalide' }, { status: 404 }))
    }

    const { data: existingMandats } = await admin
      .from('mandats')
      .select('id')
      .eq('property_id', propertyId)
      .in('status', ['DRAFT', 'PENDING_SIGNATURE', 'ACTIVE'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (existingMandats && existingMandats.length > 0) {
      return applyCookies(
        NextResponse.json(
          { error: 'Un mandat actif ou en attente existe déjà pour cette propriété' },
          { status: 409 }
        )
      )
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    if (start >= end) {
      return applyCookies(
        NextResponse.json({ error: 'La date de début doit être antérieure à la date de fin' }, { status: 400 })
      )
    }

    const mandatId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    const { data: mandat, error } = await admin
      .from('mandats')
      .insert({
        id: mandatId,
        type,
        status: 'DRAFT',
        commission_rate: parseFloat(String(commissionRate)),
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        conditions: conditions || null,
        property_id: propertyId,
        owner_id: userId,
        agency_id: agencyId,
      })
      .select()
      .single()

    if (error) {
      console.error('Create mandat error:', error)
      return applyCookies(NextResponse.json({ error: 'Erreur serveur' }, { status: 500 }))
    }

    await notify({
      userId: agencyId,
      type: 'LEASE_UPDATE',
      title: 'Nouveau mandat reçu',
      message: `Le propriétaire a créé un mandat de gestion pour "${property.title}". En attente de votre signature.`,
      actionUrl: 'mandats',
      entityId: mandatId,
    })

    const enriched = await enrichSingleMandat(admin, mandat)

    return applyCookies(NextResponse.json({ mandat: enriched }, { status: 201 }))
  } catch (error) {
    console.error('Create mandat error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

async function enrichMandats(admin: ReturnType<typeof getSupabaseAdminClient>, mandats: any[]) {
  const propertyIds = [...new Set(mandats.map((m) => m.property_id))]
  const userIds = [...new Set(mandats.flatMap((m) => [m.owner_id, m.agency_id]))]

  const { data: properties } = await admin
    .from('properties')
    .select('id, title, city, address, type')
    .in('id', propertyIds)

  const { data: propertyImages } = await admin
    .from('property_images')
    .select('property_id, url')
    .in('property_id', propertyIds)
    .order('order', { ascending: true })

  const { data: users } = await admin
    .from('users')
    .select('id, first_name, last_name, email, phone, avatar_url')
    .in('id', userIds)

  const propMap = new Map(properties?.map((p) => [p.id, p]))
  const imgMap = new Map<string, any[]>()
  for (const img of propertyImages ?? []) {
    const arr = imgMap.get(img.property_id) ?? []
    arr.push(img)
    imgMap.set(img.property_id, arr)
  }
  const userMap = new Map(users?.map((u) => [u.id, u]))

  return mandats.map((m) => {
    const property = propMap.get(m.property_id)
    const images = property ? imgMap.get(property.id) ?? [] : []
    const agency = userMap.get(m.agency_id)
    const owner = userMap.get(m.owner_id)
    return mapMandat(m, property, images.slice(0, 1), agency, owner)
  })
}

async function enrichSingleMandat(admin: ReturnType<typeof getSupabaseAdminClient>, m: any) {
  const { data: property } = await admin
    .from('properties')
    .select('id, title, city, address, type, price')
    .eq('id', m.property_id)
    .single()

  const { data: images } = await admin
    .from('property_images')
    .select('id, url, order, created_at')
    .eq('property_id', m.property_id)
    .order('order', { ascending: true })

  const { data: agency } = await admin
    .from('users')
    .select('id, first_name, last_name, email, phone, avatar_url')
    .eq('id', m.agency_id)
    .single()

  const { data: owner } = await admin
    .from('users')
    .select('id, first_name, last_name, email, phone, avatar_url')
    .eq('id', m.owner_id)
    .single()

  return mapMandat(m, property, images ?? [], agency, owner)
}

function mapMandat(m: any, property?: any, images?: any[], agency?: any, owner?: any) {
  return {
    id: m.id,
    propertyId: m.property_id,
    ownerId: m.owner_id,
    agencyId: m.agency_id,
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
    ownerSignatureImage: m.owner_signature_image,
    agencySignatureImage: m.agency_signature_image,
    contractUrl: m.contract_url,
    cryptoneoOperationId: m.cryptoneo_operation_id,
    terminatedAt: m.terminated_at,
    terminationReason: m.termination_reason,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
    property: property
      ? {
          id: property.id,
          title: property.title,
          city: property.city,
          address: property.address,
          type: property.type,
          price: property.price,
          images: (images ?? []).map((img: any) => ({
            id: img.id,
            url: img.url,
            order: img.order,
            createdAt: img.created_at,
            propertyId: img.property_id,
          })),
        }
      : undefined,
    agency: agency
      ? {
          id: agency.id,
          firstName: agency.first_name,
          lastName: agency.last_name,
          email: agency.email,
          phone: agency.phone,
          avatarUrl: agency.avatar_url,
        }
      : undefined,
    owner: owner
      ? {
          id: owner.id,
          firstName: owner.first_name,
          lastName: owner.last_name,
          email: owner.email,
          phone: owner.phone,
          avatarUrl: owner.avatar_url,
        }
      : undefined,
  }
}
