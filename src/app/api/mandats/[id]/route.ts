import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify } from '@/lib/notify'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return applyCookies(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }))
    }

    const { id } = await params
    const admin = getSupabaseAdminClient()

    const { data: user } = await admin
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single()

    const effectiveRole = user?.active_role || user?.role

    const { data: mandatRow } = await admin
      .from('mandats')
      .select('*')
      .eq('id', id)
      .single()

    if (!mandatRow) {
      return applyCookies(NextResponse.json({ error: 'Mandat introuvable' }, { status: 404 }))
    }

    if (mandatRow.owner_id !== userId && mandatRow.agency_id !== userId && effectiveRole !== 'ADMIN') {
      return applyCookies(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }))
    }

    const enriched = await enrichSingleMandat(admin, mandatRow)

    return applyCookies(NextResponse.json({ mandat: enriched }))
  } catch (error) {
    console.error('Get mandat error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return applyCookies(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }))
    }

    const { id } = await params
    const admin = getSupabaseAdminClient()

    const { data: mandatRow } = await admin
      .from('mandats')
      .select('*')
      .eq('id', id)
      .single()

    if (!mandatRow) {
      return applyCookies(NextResponse.json({ error: 'Mandat introuvable' }, { status: 404 }))
    }

    const body = await req.json()
    const { action, type, commissionRate, startDate, endDate, conditions, terminationReason } = body

    // ─── Termination ────────────────────────────────────────────────────────
    if (action === 'terminate') {
      if (mandatRow.owner_id !== userId) {
        return applyCookies(NextResponse.json({ error: 'Seul le propriétaire peut résilier le mandat' }, { status: 403 }))
      }
      if (!terminationReason) {
        return applyCookies(NextResponse.json({ error: 'La raison de la résiliation est requise' }, { status: 400 }))
      }
      if (mandatRow.status !== 'ACTIVE' && mandatRow.status !== 'PENDING_SIGNATURE') {
        return applyCookies(
          NextResponse.json(
            { error: 'Seul un mandat actif ou en attente de signature peut être résilié' },
            { status: 400 }
          )
        )
      }

      const { data: updatedRow } = await admin
        .from('mandats')
        .update({
          status: 'TERMINATED',
          terminated_at: new Date().toISOString(),
          termination_reason: terminationReason,
        })
        .eq('id', id)
        .select()
        .single()

      const { data: property } = await admin
        .from('properties')
        .select('title')
        .eq('id', mandatRow.property_id)
        .single()

      await notify({
        userId: mandatRow.agency_id,
        type: 'LEASE_UPDATE',
        title: 'Mandat résilié',
        message: `Le mandat pour "${property?.title ?? ''}" a été résilié par le propriétaire. Raison : ${terminationReason}`,
        actionUrl: 'mandats',
        entityId: id,
      })

      const enriched = await enrichSingleMandat(admin, updatedRow)

      return applyCookies(NextResponse.json({ mandat: enriched }))
    }

    // ─── Owner signs ────────────────────────────────────────────────────────
    if (action === 'sign') {
      if (mandatRow.owner_id !== userId) {
        return applyCookies(NextResponse.json({ error: 'Seul le propriétaire peut signer ce mandat' }, { status: 403 }))
      }
      if (mandatRow.status !== 'DRAFT' && mandatRow.status !== 'PENDING_SIGNATURE') {
        return applyCookies(
          NextResponse.json(
            { error: 'Ce mandat ne peut plus être signé' },
            { status: 400 }
          )
        )
      }
      if (mandatRow.owner_signed_at) {
        return applyCookies(NextResponse.json({ error: 'Vous avez déjà signé ce mandat' }, { status: 400 }))
      }

      const now = new Date()
      const bothSigned = mandatRow.agency_signed_at !== null
      const newStatus = bothSigned ? 'ACTIVE' : 'PENDING_SIGNATURE'

      const { data: updatedRow } = await admin
        .from('mandats')
        .update({
          owner_signed_at: now.toISOString(),
          status: newStatus,
        })
        .eq('id', id)
        .select()
        .single()

      const enriched = await enrichSingleMandat(admin, updatedRow)

      return applyCookies(NextResponse.json({ mandat: enriched }))
    }

    // ─── General update (only DRAFT status) ─────────────────────────────────
    if (mandatRow.status !== 'DRAFT') {
      return applyCookies(
        NextResponse.json(
          { error: 'Seul un mandat en brouillon peut être modifié' },
          { status: 400 }
        )
      )
    }

    if (mandatRow.owner_id !== userId) {
      return applyCookies(NextResponse.json({ error: 'Seul le propriétaire peut modifier ce mandat' }, { status: 403 }))
    }

    const updateData: Record<string, unknown> = {}

    if (type !== undefined) {
      const validTypes = ['GESTION_COMPLETE', 'GESTION_LOCATION', 'MANDAT_SIMPLE']
      if (!validTypes.includes(type)) {
        return applyCookies(NextResponse.json({ error: 'Type de mandat invalide' }, { status: 400 }))
      }
      updateData.type = type
    }

    if (commissionRate !== undefined) {
      const rate = parseFloat(String(commissionRate))
      if (isNaN(rate) || rate < 0 || rate > 100) {
        return applyCookies(NextResponse.json({ error: 'Le taux de commission doit être entre 0 et 100' }, { status: 400 }))
      }
      updateData.commission_rate = rate
    }

    if (startDate !== undefined) {
      updateData.start_date = new Date(startDate).toISOString()
    }

    if (endDate !== undefined) {
      updateData.end_date = new Date(endDate).toISOString()
    }

    if (conditions !== undefined) {
      updateData.conditions = conditions
    }

    const finalStart = updateData.start_date ?? mandatRow.start_date
    const finalEnd = updateData.end_date ?? mandatRow.end_date
    if (new Date(finalStart as string) >= new Date(finalEnd as string)) {
      return applyCookies(NextResponse.json({ error: 'La date de début doit être antérieure à la date de fin' }, { status: 400 }))
    }

    const { data: updatedRow } = await admin
      .from('mandats')
      .update(updateData as any)
      .eq('id', id)
      .select()
      .single()

    const enriched = await enrichSingleMandat(admin, updatedRow)

    return applyCookies(NextResponse.json({ mandat: enriched }))
  } catch (error) {
    console.error('Update mandat error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
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
