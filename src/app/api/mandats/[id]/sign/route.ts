import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify } from '@/lib/notify'

export async function POST(
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

    if (mandatRow.status !== 'DRAFT' && mandatRow.status !== 'PENDING_SIGNATURE') {
      return applyCookies(
        NextResponse.json(
          { error: 'Ce mandat ne peut plus être signé' },
          { status: 400 }
        )
      )
    }

    const body = await req.json().catch(() => ({}))
    const { role } = body

    const isOwner = mandatRow.owner_id === userId
    const isAgency = mandatRow.agency_id === userId

    if (!isOwner && !isAgency) {
      return applyCookies(NextResponse.json({ error: 'Vous n\'êtes pas partie à ce mandat' }, { status: 403 }))
    }

    let signingAsOwner = isOwner
    if (role === 'agency' && isAgency) {
      signingAsOwner = false
    } else if (role === 'owner' && isOwner) {
      signingAsOwner = true
    } else if (isOwner && isAgency) {
      signingAsOwner = true
    }

    const now = new Date()

    if (signingAsOwner) {
      if (mandatRow.owner_signed_at) {
        return applyCookies(NextResponse.json({ error: 'Le propriétaire a déjà signé ce mandat' }, { status: 400 }))
      }

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

      await notify({
        userId: mandatRow.agency_id,
        type: 'LEASE_UPDATE',
        title: bothSigned ? 'Mandat activé' : 'Mandat signé par le propriétaire',
        message: bothSigned
          ? `Le mandat pour "${enriched.property?.title ?? ''}" est maintenant actif. Les deux parties ont signé.`
          : `Le propriétaire a signé le mandat pour "${enriched.property?.title ?? ''}". En attente de votre signature.`,
        actionUrl: 'mandats',
        entityId: id,
      })

      return applyCookies(NextResponse.json({
        mandat: enriched,
        signedAs: 'owner',
        bothSigned,
      }))
    } else {
      if (mandatRow.agency_signed_at) {
        return applyCookies(NextResponse.json({ error: 'L\'agence a déjà signé ce mandat' }, { status: 400 }))
      }

      const bothSigned = mandatRow.owner_signed_at !== null
      const newStatus = bothSigned ? 'ACTIVE' : 'PENDING_SIGNATURE'

      const { data: updatedRow } = await admin
        .from('mandats')
        .update({
          agency_signed_at: now.toISOString(),
          status: newStatus,
        })
        .eq('id', id)
        .select()
        .single()

      const enriched = await enrichSingleMandat(admin, updatedRow)

      await notify({
        userId: mandatRow.owner_id,
        type: 'LEASE_UPDATE',
        title: bothSigned ? 'Mandat activé' : 'Mandat signé par l\'agence',
        message: bothSigned
          ? `Le mandat pour "${enriched.property?.title ?? ''}" est maintenant actif. Les deux parties ont signé.`
          : `L'agence a signé le mandat pour "${enriched.property?.title ?? ''}". En attente de votre signature.`,
        actionUrl: 'mandats',
        entityId: id,
      })

      return applyCookies(NextResponse.json({
        mandat: enriched,
        signedAs: 'agency',
        bothSigned,
      }))
    }
  } catch (error) {
    console.error('Sign mandat error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

async function enrichSingleMandat(admin: ReturnType<typeof getSupabaseAdminClient>, m: any) {
  const { data: property } = await admin
    .from('properties')
    .select('id, title, city, address, type')
    .eq('id', m.property_id)
    .single()

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

  return mapMandat(m, property, agency, owner)
}

function mapMandat(m: any, property?: any, agency?: any, owner?: any) {
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
