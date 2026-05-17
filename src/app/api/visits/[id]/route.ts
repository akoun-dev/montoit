import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

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

    if (effectiveRole !== 'LOCATAIRE' && effectiveRole !== 'PROPRIETAIRE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { id } = await params

    // Build where clause based on role
    const where: Record<string, unknown> = { id }
    if (effectiveRole === 'LOCATAIRE') {
      where.tenantId = userId
    } else if (effectiveRole === 'PROPRIETAIRE') {
      where.property = { ownerId: userId }
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

// PATCH /api/visits/[id] — Update visit request status (accept/reject/counter-propose)
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

    // Only PROPRIETAIRE or AGENCE can update visit requests
    if (effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { status, counterDate, counterTimeSlot, ownerComment } = body as {
      status?: string
      counterDate?: string
      counterTimeSlot?: string
      ownerComment?: string
    }

    // Validate that the visit belongs to a property owned by this user
    const visit = await db.visitRequest.findFirst({
      where: { id, property: { ownerId: userId } },
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
    await db.notification.create({
      data: {
        userId: visit.tenantId,
        type: 'VISIT_REMINDER',
        title: 'Demande de visite ' + (statusLabels[status] || 'mise à jour'),
        message: `Votre visite pour "${updated.property.title}" a été ${statusLabels[status] || 'mise à jour'}.`,
        entityId: visit.id,
      },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Visit PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
