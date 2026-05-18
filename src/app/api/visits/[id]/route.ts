import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'
import { notify } from '@/lib/notify'

// GET /api/visits/[id] — Get a single visit request detail
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'LOCATAIRE' && effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { id } = await params

    // Build where clause based on role
    const where: Record<string, unknown> = { id }
    if (effectiveRole === 'LOCATAIRE') {
      where.tenantId = userId
    } else if (effectiveRole === 'PROPRIETAIRE') {
      // Propriétaire: only see visits from TC-verified tenants
      where.property = { ownerId: userId }
      where.tenant = { rentalFiles: { some: { status: 'VALIDATED' } } }
    } else if (effectiveRole === 'AGENCE') {
      // Agence: only see visits from TC-verified tenants for properties under their mandats
      where.property = { mandats: { some: { agencyId: userId, status: 'ACTIVE' } } }
      where.tenant = { rentalFiles: { some: { status: 'VALIDATED' } } }
    }

    const visit = await db.visitRequest.findFirst({
      where,
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            city: true,
            type: true,
            price: true,
            currency: true,
            images: {
              orderBy: { order: 'asc' },
              take: 3,
              select: { url: true },
            },
            owner: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        tenant: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
      },
    })

    if (!visit) {
      return NextResponse.json({ error: 'Visite introuvable' }, { status: 404 })
    }

    return NextResponse.json({ data: visit })
  } catch (error) {
    console.error('Visit detail GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH /api/visits/[id] — Update visit request status
// PROPRIETAIRE/AGENCE: accept, reject, counter-propose
// LOCATAIRE: cancel (set status to CANCELLED)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    const { id } = await params
    const body = await req.json()
    const { status, counterDate, counterTimeSlot, ownerComment } = body as {
      status?: string
      counterDate?: string
      counterTimeSlot?: string
      ownerComment?: string
    }

    // ─── LOCATAIRE cancellation ──────────────────────────────────────────────
    if (effectiveRole === 'LOCATAIRE') {
      if (status !== 'CANCELLED') {
        return NextResponse.json(
          { error: 'Les locataires ne peuvent annuler que les visites (CANCELLED)' },
          { status: 400 }
        )
      }

      // Find the visit belonging to this tenant
      const visit = await db.visitRequest.findFirst({
        where: { id, tenantId: userId },
      })

      if (!visit) {
        return NextResponse.json({ error: 'Visite introuvable ou accès refusé' }, { status: 404 })
      }

      // Only allow cancellation if status is PENDING or ACCEPTED
      if (visit.status !== 'PENDING' && visit.status !== 'ACCEPTED') {
        return NextResponse.json(
          { error: 'Seules les visites en attente ou acceptées peuvent être annulées' },
          { status: 400 }
        )
      }

      const updated = await db.visitRequest.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: {
          tenant: { select: { id: true, firstName: true, lastName: true } },
          property: { select: { id: true, title: true, city: true, ownerId: true } },
        },
      })

      // Create notification for the property owner
      await notify({
        userId: updated.property.ownerId,
        type: 'VISIT_REMINDER',
        title: 'Visite annulée',
        message: `${updated.tenant.firstName} ${updated.tenant.lastName} a annulé la visite pour "${updated.property.title}".`,
        actionUrl: 'visit-requests',
        entityId: visit.id,
      })

      return NextResponse.json({ data: updated })
    }

    // ─── PROPRIETAIRE / AGENCE: accept, reject, counter-propose ─────────────
    if (effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Build where clause: validate ownership/mandat AND TC verification
    const visitWhere: Record<string, unknown> = { id }
    if (effectiveRole === 'PROPRIETAIRE') {
      visitWhere.property = { ownerId: userId }
      // Only allow actions on visits from TC-verified tenants
      visitWhere.tenant = { rentalFiles: { some: { status: 'VALIDATED' } } }
    } else if (effectiveRole === 'AGENCE') {
      visitWhere.property = { mandats: { some: { agencyId: userId, status: 'ACTIVE' } } }
      // Only allow actions on visits from TC-verified tenants
      visitWhere.tenant = { rentalFiles: { some: { status: 'VALIDATED' } } }
    }

    const visit = await db.visitRequest.findFirst({
      where: visitWhere,
    })

    if (!visit) {
      return NextResponse.json({ error: 'Visite introuvable ou accès refusé' }, { status: 404 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (status === 'ACCEPTED') {
      updateData.status = 'ACCEPTED'
    } else if (status === 'REJECTED') {
      updateData.status = 'REJECTED'
      if (ownerComment) updateData.ownerComment = ownerComment
    } else if (status === 'COUNTER_PROPOSED') {
      updateData.status = 'COUNTER_PROPOSED'
      if (counterDate) updateData.counterDate = new Date(counterDate)
      if (counterTimeSlot) updateData.counterTimeSlot = counterTimeSlot
      if (ownerComment) updateData.ownerComment = ownerComment
    } else {
      return NextResponse.json({ error: 'Statut invalide. Utilisez ACCEPTED, REJECTED ou COUNTER_PROPOSED' }, { status: 400 })
    }

    const updated = await db.visitRequest.update({
      where: { id },
      data: updateData,
      include: {
        tenant: { select: { id: true, firstName: true, lastName: true } },
        property: { select: { id: true, title: true, city: true } },
      },
    })

    // Create notification for tenant
    const statusLabels: Record<string, string> = {
      ACCEPTED: 'acceptée',
      REJECTED: 'refusée',
      COUNTER_PROPOSED: 'contre-proposée',
    }
    await notify({
      userId: visit.tenantId,
      type: 'VISIT_REMINDER',
      title: 'Demande de visite ' + (statusLabels[status] || 'mise à jour'),
      message: `Votre visite pour "${updated.property.title}" a été ${statusLabels[status] || 'mise à jour'}.`,
      actionUrl: 'my-visits',
      entityId: visit.id,
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Visit PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
