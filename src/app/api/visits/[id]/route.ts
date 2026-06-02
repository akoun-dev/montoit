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

// GET /api/visits/[id] — Get a single visit request detail
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    if (role !== 'LOCATAIRE' && role !== 'PROPRIETAIRE' && role !== 'AGENCE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { id } = await params

    const { data: visit } = await admin
      .from('visit_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (!visit) {
      return NextResponse.json({ error: 'Visite introuvable' }, { status: 404 })
    }

    if (role === 'LOCATAIRE') {
      if (visit.tenant_id !== userId) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }
    } else if (role === 'PROPRIETAIRE') {
      const { data: property } = await admin
        .from('properties')
        .select('id, owner_id')
        .eq('id', visit.property_id)
        .single()

      if (!property || property.owner_id !== userId) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }

      const { data: validatedTenant } = await admin
        .from('rental_files')
        .select('id')
        .eq('tenant_id', visit.tenant_id)
        .eq('status', 'VALIDATED')
        .maybeSingle()

      if (!validatedTenant) {
        return NextResponse.json({ error: 'Visite introuvable' }, { status: 404 })
      }
    } else if (role === 'AGENCE') {
      const { data: mandat } = await admin
        .from('mandats')
        .select('id')
        .eq('property_id', visit.property_id)
        .eq('agency_id', userId)
        .eq('status', 'ACTIVE')
        .maybeSingle()

      if (!mandat) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }

      const { data: validatedTenant } = await admin
        .from('rental_files')
        .select('id')
        .eq('tenant_id', visit.tenant_id)
        .eq('status', 'VALIDATED')
        .maybeSingle()

      if (!validatedTenant) {
        return NextResponse.json({ error: 'Visite introuvable' }, { status: 404 })
      }
    }

    const enriched = await enrichVisitDetail(admin, visit)

    return NextResponse.json({ data: enriched })
  } catch (error) {
    console.error('Visit detail GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH /api/visits/[id] — Update visit request status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const body = await req.json()
    const { status, counterDate, counterTimeSlot, ownerComment, assignedAgentId, tenantRating, tenantReview } = body as {
      status?: string
      counterDate?: string
      counterTimeSlot?: string
      ownerComment?: string
      assignedAgentId?: string | null
      tenantRating?: number
      tenantReview?: string
    }

    // ─── LOCATAIRE review (after completed visit) ───────────────────────────
    if (role === 'LOCATAIRE' && (tenantRating !== undefined || tenantReview !== undefined)) {
      const { data: visit } = await admin
        .from('visit_requests')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', userId)
        .single()

      if (!visit) {
        return NextResponse.json({ error: 'Visite introuvable ou accès refusé' }, { status: 404 })
      }

      if (visit.status !== 'COMPLETED') {
        return NextResponse.json(
          { error: 'Vous ne pouvez évaluer que les visites terminées' },
          { status: 400 }
        )
      }

      if (tenantRating !== undefined && (!Number.isInteger(tenantRating) || tenantRating < 1 || tenantRating > 5)) {
        return NextResponse.json(
          { error: 'La note doit être un entier entre 1 et 5' },
          { status: 400 }
        )
      }

      const updateData: Record<string, any> = {}
      if (tenantRating !== undefined) updateData.tenant_rating = tenantRating
      if (tenantReview !== undefined) updateData.tenant_review = tenantReview

      const { data: updated } = await (admin as any)
        .from('visit_requests')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (!updated) {
        return NextResponse.json({ error: 'Erreur lors de l\'enregistrement de l\'avis' }, { status: 500 })
      }

      const enriched = await enrichVisitDetail(admin, updated)
      return NextResponse.json({ data: enriched })
    }

    // ─── LOCATAIRE cancellation ──────────────────────────────────────────────
    if (role === 'LOCATAIRE') {
      if (status !== 'CANCELLED') {
        return NextResponse.json(
          { error: 'Les locataires ne peuvent annuler que les visites (CANCELLED)' },
          { status: 400 }
        )
      }

      const { data: visit } = await admin
        .from('visit_requests')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', userId)
        .single()

      if (!visit) {
        return NextResponse.json({ error: 'Visite introuvable ou accès refusé' }, { status: 404 })
      }

      if (visit.status !== 'PENDING' && visit.status !== 'ACCEPTED') {
        return NextResponse.json(
          { error: 'Seules les visites en attente ou acceptées peuvent être annulées' },
          { status: 400 }
        )
      }

      const { data: updated } = await admin
        .from('visit_requests')
        .update({ status: 'CANCELLED' })
        .eq('id', id)
        .select()
        .single()

      if (!updated) {
        return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
      }

      const { data: propInfo } = await admin
        .from('properties')
        .select('title, owner_id')
        .eq('id', visit.property_id)
        .single()

      const { data: tenantInfo } = await admin
        .from('users')
        .select('first_name, last_name')
        .eq('id', userId)
        .single()

      if (propInfo?.owner_id) {
        await notify({
          userId: propInfo.owner_id,
          type: 'VISIT_REMINDER',
          title: 'Visite annulée',
          message: `${tenantInfo?.first_name || ''} ${tenantInfo?.last_name || ''} a annulé la visite pour "${propInfo?.title || ''}".`,
          actionUrl: 'visit-requests',
          entityId: visit.id,
        })
      }

      const enriched = await enrichVisitDetail(admin, updated)
      return NextResponse.json({ data: enriched })
    }

    // ─── PROPRIETAIRE / AGENCE: accept, reject, counter-propose, assign agent ─
    if (role !== 'PROPRIETAIRE' && role !== 'AGENCE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { data: visit } = await admin
      .from('visit_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (!visit) {
      return NextResponse.json({ error: 'Visite introuvable' }, { status: 404 })
    }

    if (role === 'PROPRIETAIRE') {
      const { data: property } = await admin
        .from('properties')
        .select('id')
        .eq('id', visit.property_id)
        .eq('owner_id', userId)
        .maybeSingle()

      if (!property) {
        return NextResponse.json({ error: 'Visite introuvable ou accès refusé' }, { status: 404 })
      }
    } else if (role === 'AGENCE') {
      const { data: mandat } = await admin
        .from('mandats')
        .select('id')
        .eq('property_id', visit.property_id)
        .eq('agency_id', userId)
        .eq('status', 'ACTIVE')
        .maybeSingle()

      if (!mandat) {
        return NextResponse.json({ error: 'Visite introuvable ou accès refusé' }, { status: 404 })
      }
    }

    // ─── Assign agent (standalone update, no status change needed) ─────────
    if (assignedAgentId !== undefined) {
      const updateData: Record<string, any> = { assigned_agent_id: assignedAgentId || null }

      const { data: updated } = await (admin as any)
        .from('visit_requests')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (!updated) {
        return NextResponse.json({ error: 'Erreur lors de l\'assignation' }, { status: 500 })
      }

      const enriched = await enrichVisitDetail(admin, updated)
      return NextResponse.json({ data: enriched })
    }

    const { data: validatedTenant } = await admin
      .from('rental_files')
      .select('id')
      .eq('tenant_id', visit.tenant_id)
      .eq('status', 'VALIDATED')
      .maybeSingle()

    if (!validatedTenant) {
      return NextResponse.json({ error: 'Visite introuvable' }, { status: 404 })
    }

    const updateData: any = {}

    if (status === 'ACCEPTED') {
      updateData.status = 'ACCEPTED'
    } else if (status === 'REJECTED') {
      updateData.status = 'REJECTED'
      if (ownerComment) updateData.owner_comment = ownerComment
    } else if (status === 'COUNTER_PROPOSED') {
      updateData.status = 'COUNTER_PROPOSED'
      if (counterDate) updateData.counter_date = new Date(counterDate).toISOString()
      if (counterTimeSlot) updateData.counter_time_slot = counterTimeSlot
      if (ownerComment) updateData.owner_comment = ownerComment
    } else {
      return NextResponse.json({ error: 'Statut invalide. Utilisez ACCEPTED, REJECTED ou COUNTER_PROPOSED' }, { status: 400 })
    }

    const { data: updated } = await (admin as any)
      .from('visit_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (!updated) {
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
    }

    const { data: propInfo } = await admin
      .from('properties')
      .select('title')
      .eq('id', visit.property_id)
      .single()

    const statusLabels: Record<string, string> = {
      ACCEPTED: 'acceptée',
      REJECTED: 'refusée',
      COUNTER_PROPOSED: 'contre-proposée',
    }

    await notify({
      userId: visit.tenant_id,
      type: 'VISIT_REMINDER',
      title: 'Demande de visite ' + (statusLabels[status] || 'mise à jour'),
      message: `Votre visite pour "${propInfo?.title || ''}" a été ${statusLabels[status] || 'mise à jour'}.`,
      actionUrl: 'my-visits',
      entityId: visit.id,
    })

    const enriched = await enrichVisitDetail(admin, updated)
    return NextResponse.json({ data: enriched })
  } catch (error) {
    console.error('Visit PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

async function enrichVisitDetail(admin: ReturnType<typeof getSupabaseAdminClient>, visit: any) {
  const { data: property } = await admin
    .from('properties')
    .select('id, title, address, city, type, price, currency, owner_id')
    .eq('id', visit.property_id)
    .single()

  let owner: any = null
  if (property?.owner_id) {
    const { data: o } = await admin
      .from('users')
      .select('id, first_name, last_name')
      .eq('id', property.owner_id)
      .single()
    if (o) owner = o
  }

  const { data: propertyImages } = await admin
    .from('property_images')
    .select('url')
    .eq('property_id', visit.property_id)
    .order('order', { ascending: true })
    .limit(3)

  const { data: tenant } = await admin
    .from('users')
    .select('id, first_name, last_name, phone, email')
    .eq('id', visit.tenant_id)
    .single()

  // Fetch rental file for this tenant + property
  let rentalFile: any = null
  const { data: rentalFileLeases } = await admin
    .from('leases')
    .select('id, rental_file_id, property_id, status')
    .eq('tenant_id', visit.tenant_id)
    .eq('property_id', visit.property_id)
    .order('created_at', { ascending: false })
    .limit(1)

  const lease = rentalFileLeases?.[0]
  if (lease?.rental_file_id) {
    const { data: rf } = await admin
      .from('rental_files')
      .select('id, tenant_id, status, tenant_category, monthly_income, employer, employment_type, guarantor_name, guarantor_phone, guarantor_relation, rejection_reason, created_at')
      .eq('id', lease.rental_file_id)
      .single()

    if (rf) {
      const { data: rfDocs } = await admin
        .from('rental_file_documents')
        .select('id, type, name, status')
        .eq('rental_file_id', rf.id)
        .order('created_at', { ascending: false })

      rentalFile = {
        id: rf.id,
        status: rf.status,
        tenantCategory: rf.tenant_category,
        monthlyIncome: rf.monthly_income,
        employer: rf.employer,
        employmentType: rf.employment_type,
        guarantorName: rf.guarantor_name,
        guarantorPhone: rf.guarantor_phone,
        guarantorRelation: rf.guarantor_relation,
        rejectionReason: rf.rejection_reason,
        createdAt: rf.created_at,
        documents: (rfDocs || []).map((d: any) => ({
          id: d.id, type: d.type, name: d.name, status: d.status,
        })),
        leaseStatus: lease.status,
      }
    }
  }    return {
    id: visit.id,
    visitType: visit.visit_type,
    requestedDate: visit.requested_date,
    timeSlot: visit.time_slot,
    status: visit.status,
    counterDate: visit.counter_date,
    counterTimeSlot: visit.counter_time_slot,
    ownerComment: visit.owner_comment,
    tenantMessage: visit.tenant_message,
    tenantRating: visit.tenant_rating,
    tenantReview: visit.tenant_review,
    createdAt: visit.created_at,
    updatedAt: visit.updated_at,
    propertyId: visit.property_id,
    tenantId: visit.tenant_id,
    assignedAgentId: visit.assigned_agent_id,
    property: property ? {
      id: property.id,
      title: property.title,
      address: property.address,
      city: property.city,
      type: property.type,
      price: property.price,
      currency: property.currency,
      images: (propertyImages ?? []).map((img: any) => ({ url: img.url })),
      owner: owner ? { id: owner.id, firstName: owner.first_name, lastName: owner.last_name } : undefined,
    } : undefined,
    tenant: tenant ? {
      id: tenant.id,
      firstName: tenant.first_name,
      lastName: tenant.last_name,
      phone: tenant.phone,
      email: tenant.email,
    } : undefined,
    rentalFile: rentalFile ? {
      id: rentalFile.id,
      status: rentalFile.status,
      tenantCategory: rentalFile.tenantCategory,
      monthlyIncome: rentalFile.monthlyIncome,
      employer: rentalFile.employer,
      employmentType: rentalFile.employmentType,
      guarantorName: rentalFile.guarantorName,
      guarantorPhone: rentalFile.guarantorPhone,
      guarantorRelation: rentalFile.guarantorRelation,
      rejectionReason: rentalFile.rejectionReason,
      createdAt: rentalFile.createdAt,
      documents: rentalFile.documents,
      leaseStatus: rentalFile.leaseStatus,
    } : null,
  }
}
