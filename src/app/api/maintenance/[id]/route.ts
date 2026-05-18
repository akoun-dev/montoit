import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify } from '@/lib/notify'

const OWNER_ALLOWED_STATUSES = ['IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const
const VALID_STATUSES = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const

async function enrichMaintenanceRequest(supabase: any, id: string) {
  const { data: mr } = await (supabase
    .from('maintenance_requests')
    .select('*')
    .eq('id', id)
    .single())

  if (!mr) return null

  // Fetch lease with property and owner
  let leaseData: any = null
  if (mr.lease_id) {
    const { data: lease } = await (supabase
      .from('leases')
      .select('id, start_date, end_date, monthly_rent, property_id, owner_id')
      .eq('id', mr.lease_id)
      .single())

    if (lease) {
      let propertyData: any = null
      if (lease.property_id) {
        const { data: property } = await (supabase
          .from('properties')
          .select('id, title, address, city')
          .eq('id', lease.property_id)
          .single())

        if (property) {
          const { data: images } = await (supabase
            .from('property_images')
            .select('url')
            .eq('property_id', property.id)
            .order('order', { ascending: true })
            .limit(1))

          propertyData = {
            id: property.id,
            title: property.title,
            address: property.address,
            city: property.city,
            images: (images ?? []).map((i: any) => ({ url: i.url })),
          }
        }
      }

      let ownerData: any = null
      if (lease.owner_id) {
        const { data: owner } = await (supabase
          .from('users')
          .select('id, first_name, last_name')
          .eq('id', lease.owner_id)
          .single())
        if (owner) {
          ownerData = { id: owner.id, firstName: owner.first_name, lastName: owner.last_name }
        }
      }

      leaseData = {
        id: lease.id,
        startDate: lease.start_date,
        endDate: lease.end_date,
        monthlyRent: lease.monthly_rent,
        property: propertyData,
        owner: ownerData,
      }
    }
  }

  // Fetch comments
  const { data: comments } = await (supabase
    .from('maintenance_comments')
    .select('*')
    .eq('maintenance_request_id', id)
    .order('created_at', { ascending: true }))

  const authorIds = [...new Set((comments ?? []).map((c: any) => c.author_id).filter(Boolean))]
  let authorMap: Record<string, any> = {}
  if (authorIds.length > 0) {
    const { data: authors } = await (supabase
      .from('users')
      .select('id, first_name, last_name, avatar_url')
      .in('id', authorIds))
    for (const a of authors ?? []) {
      authorMap[a.id] = { id: a.id, firstName: a.first_name, lastName: a.last_name, avatarUrl: a.avatar_url }
    }
  }

  const mappedComments = (comments ?? []).map((c: any) => ({
    id: c.id,
    content: c.content,
    maintenanceRequestId: c.maintenance_request_id,
    authorId: c.author_id,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    author: authorMap[c.author_id] || null,
  }))

  return {
    id: mr.id,
    title: mr.title,
    description: mr.description,
    status: mr.status,
    priority: mr.priority,
    images: mr.images,
    resolution: mr.resolution,
    leaseId: mr.lease_id,
    tenantId: mr.tenant_id,
    createdAt: mr.created_at,
    updatedAt: mr.updated_at,
    lease: leaseData,
    comments: mappedComments,
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const body = await req.json()
    const { status, resolution, rejectionReason, comment } = body as {
      status?: string
      resolution?: string
      rejectionReason?: string
      comment?: string
    }

    // ─── LOCATAIRE: can only cancel (CLOSED) a PENDING request ───────────────
    if (effectiveRole === 'LOCATAIRE') {
      if (status !== 'CLOSED') {
        return NextResponse.json(
          { error: 'Seul le statut CLOSED est autorisé via cette route pour un locataire' },
          { status: 400 }
        )
      }

      const { data: mrResult } = await (supabase
        .from('maintenance_requests')
        .select('id, title, status')
        .eq('id', id)
        .eq('tenant_id', userId)
        .maybeSingle())
      const maintenanceRequest = mrResult as any

      if (!maintenanceRequest) {
        return NextResponse.json(
          { error: 'Demande introuvable ou accès refusé' },
          { status: 404 }
        )
      }

      if (maintenanceRequest.status !== 'PENDING') {
        return NextResponse.json(
          { error: 'Seules les demandes en attente peuvent être annulées' },
          { status: 400 }
        )
      }

      await (supabase.from('maintenance_requests') as any).update({ status: 'CLOSED' }).eq('id', id)

      await supabase.from('audit_logs').insert({
        action: 'UPDATE',
        entity: 'MaintenanceRequest',
        entity_id: id,
        details: `Demande de maintenance annulée: ${maintenanceRequest.title}`,
        user_id: userId,
      })

      const enriched = await enrichMaintenanceRequest(supabase, id)
      const resp = NextResponse.json({ data: enriched })
      return applyCookies(resp)
    }

    // ─── PROPRIETAIRE / AGENCE: full status management ───────────────────────
    if (effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Validate the maintenance request belongs to a lease on a property owned by this user
    const { data: ownerLeases } = await (supabase
      .from('leases')
      .select('id')
      .eq('owner_id', userId))
    const ownerLeaseIds = (ownerLeases ?? []).map((l: any) => l.id)

    let mrQuery = supabase.from('maintenance_requests').select('id, title, status, tenant_id, lease_id').eq('id', id)
    if (ownerLeaseIds.length > 0) {
      mrQuery = mrQuery.in('lease_id', ownerLeaseIds)
    } else {
      mrQuery = mrQuery.eq('lease_id', '__nonexistent__')
    }
    const { data: mrData } = await (mrQuery.maybeSingle())
    const maintenanceRequest = mrData as any

    if (!maintenanceRequest) {
      return NextResponse.json(
        { error: 'Demande introuvable ou accès refusé' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    const auditDetails: string[] = []

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
        return NextResponse.json(
          { error: 'Statut invalide. Utilisez IN_PROGRESS, RESOLVED ou CLOSED' },
          { status: 400 }
        )
      }

      if (!OWNER_ALLOWED_STATUSES.includes(status as (typeof OWNER_ALLOWED_STATUSES)[number])) {
        return NextResponse.json(
          { error: 'Les propriétaires ne peuvent pas définir le statut à ' + status },
          { status: 400 }
        )
      }

      const statusOrder: Record<string, number> = {
        PENDING: 0,
        IN_PROGRESS: 1,
        RESOLVED: 2,
        CLOSED: 3,
      }
      const currentOrder = statusOrder[maintenanceRequest.status] ?? 0
      const newOrder = statusOrder[status] ?? 0

      if (newOrder < currentOrder) {
        return NextResponse.json(
          {
            error: `Transition de statut invalide: ${maintenanceRequest.status} → ${status}. Le statut ne peut pas revenir en arrière.`,
          },
          { status: 400 }
        )
      }

      updateData.status = status
      auditDetails.push(`statut: ${maintenanceRequest.status} → ${status}`)
    }

    if (resolution !== undefined) {
      if (typeof resolution !== 'string' || resolution.trim().length === 0) {
        return NextResponse.json(
          { error: 'Le texte de résolution ne peut pas être vide' },
          { status: 400 }
        )
      }
      updateData.resolution = resolution.trim()
      auditDetails.push('résolution ajoutée')
    }

    if (rejectionReason !== undefined) {
      if (typeof rejectionReason !== 'string' || rejectionReason.trim().length === 0) {
        return NextResponse.json(
          { error: 'La raison du rejet ne peut pas être vide' },
          { status: 400 }
        )
      }

      updateData.status = 'CLOSED'
      updateData.resolution = `[REJETÉ] ${rejectionReason.trim()}`
      auditDetails.push(`rejeté: ${rejectionReason.trim()}`)
    }

    if (Object.keys(updateData).length === 0 && comment === undefined) {
      return NextResponse.json(
        { error: 'Aucune donnée à mettre à jour. Fournissez status, resolution, rejectionReason ou comment.' },
        { status: 400 }
      )
    }

    if (Object.keys(updateData).length > 0) {
      await (supabase.from('maintenance_requests') as any).update(updateData).eq('id', id)
    }

    if (comment !== undefined && typeof comment === 'string' && comment.trim().length > 0) {
      await supabase.from('maintenance_comments').insert({
        content: comment.trim(),
        maintenance_request_id: id,
        author_id: userId,
      } as any)

      await notify({
        userId: maintenanceRequest.tenant_id,
        type: 'MAINTENANCE',
        title: 'Mise à jour de votre demande de maintenance',
        message: `Votre demande "${maintenanceRequest.title}" a été mise à jour par le propriétaire.`,
        actionUrl: 'maintenance',
        entityId: id,
      })

      await supabase.from('audit_logs').insert({
        action: 'UPDATE',
        entity: 'MaintenanceRequest',
        entity_id: id,
        details: `Demande de maintenance mise à jour: ${auditDetails.join(', ')}${comment ? ' ; commentaire ajouté' : ''}`,
        user_id: userId,
      })

      const enriched = await enrichMaintenanceRequest(supabase, id)
      const resp = NextResponse.json({ data: enriched })
      return applyCookies(resp)
    }

    if (Object.keys(updateData).length > 0) {
      await notify({
        userId: maintenanceRequest.tenant_id,
        type: 'MAINTENANCE',
        title: 'Mise à jour de votre demande de maintenance',
        message: `Votre demande "${maintenanceRequest.title}" a été mise à jour par le propriétaire.`,
        actionUrl: 'maintenance',
        entityId: id,
      })

      await supabase.from('audit_logs').insert({
        action: 'UPDATE',
        entity: 'MaintenanceRequest',
        entity_id: id,
        details: `Demande de maintenance mise à jour: ${auditDetails.join(', ')}`,
        user_id: userId,
      })
    }

    const enriched = await enrichMaintenanceRequest(supabase, id)
    const resp = NextResponse.json({ data: enriched })
    return applyCookies(resp)
  } catch (error) {
    console.error('Maintenance PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
