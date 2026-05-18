import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'
import { notify } from '@/lib/notify'

// GET /api/mandats/[id] — Get mandat details
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
    const { id } = await params

    const mandat = await db.mandat.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            address: true,
            type: true,
            price: true,
            images: { orderBy: { order: 'asc' }, take: 1 },
          },
        },
        agency: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
      },
    })

    if (!mandat) {
      return NextResponse.json({ error: 'Mandat introuvable' }, { status: 404 })
    }

    // Only the owner or agency of this mandat can view it
    if (mandat.ownerId !== userId && mandat.agencyId !== userId && effectiveRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    return NextResponse.json({ mandat })
  } catch (error) {
    console.error('Get mandat error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH /api/mandats/[id] — Update mandat, sign it, or terminate it
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

    const mandat = await db.mandat.findUnique({
      where: { id },
    })

    if (!mandat) {
      return NextResponse.json({ error: 'Mandat introuvable' }, { status: 404 })
    }

    const body = await req.json()
    const { action, type, commissionRate, startDate, endDate, conditions, terminationReason } = body

    // ─── Termination ────────────────────────────────────────────────────────
    if (action === 'terminate') {
      // Only owner can terminate
      if (mandat.ownerId !== userId) {
        return NextResponse.json({ error: 'Seul le propriétaire peut résilier le mandat' }, { status: 403 })
      }
      if (!terminationReason) {
        return NextResponse.json({ error: 'La raison de la résiliation est requise' }, { status: 400 })
      }
      if (mandat.status !== 'ACTIVE' && mandat.status !== 'PENDING_SIGNATURE') {
        return NextResponse.json(
          { error: 'Seul un mandat actif ou en attente de signature peut être résilié' },
          { status: 400 }
        )
      }

      const updated = await db.mandat.update({
        where: { id },
        data: {
          status: 'TERMINATED',
          terminatedAt: new Date(),
          terminationReason,
        },
        include: {
          property: { select: { id: true, title: true, city: true, address: true } },
          agency: { select: { id: true, firstName: true, lastName: true, email: true } },
          owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      })

      // Notify the agency about the termination
      await notify({
        userId: mandat.agencyId,
        type: 'LEASE_UPDATE',
        title: 'Mandat résilié',
        message: `Le mandat pour "${updated.property.title}" a été résilié par le propriétaire. Raison : ${terminationReason}`,
        actionUrl: 'mandats',
        entityId: id,
      })

      return NextResponse.json({ mandat: updated })
    }

    // ─── Owner signs ────────────────────────────────────────────────────────
    if (action === 'sign') {
      if (mandat.ownerId !== userId) {
        return NextResponse.json({ error: 'Seul le propriétaire peut signer ce mandat' }, { status: 403 })
      }
      if (mandat.status !== 'DRAFT' && mandat.status !== 'PENDING_SIGNATURE') {
        return NextResponse.json(
          { error: 'Ce mandat ne peut plus être signé' },
          { status: 400 }
        )
      }
      if (mandat.ownerSignedAt) {
        return NextResponse.json({ error: 'Vous avez déjà signé ce mandat' }, { status: 400 })
      }

      const now = new Date()
      const bothSigned = mandat.agencySignedAt !== null
      const newStatus = bothSigned ? 'ACTIVE' : 'PENDING_SIGNATURE'

      const updated = await db.mandat.update({
        where: { id },
        data: {
          ownerSignedAt: now,
          status: newStatus,
        },
        include: {
          property: { select: { id: true, title: true, city: true, address: true } },
          agency: { select: { id: true, firstName: true, lastName: true, email: true } },
          owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      })

      return NextResponse.json({ mandat: updated })
    }

    // ─── General update (only DRAFT status) ─────────────────────────────────
    if (mandat.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Seul un mandat en brouillon peut être modifié' },
        { status: 400 }
      )
    }

    // Only the owner can edit a draft
    if (mandat.ownerId !== userId) {
      return NextResponse.json({ error: 'Seul le propriétaire peut modifier ce mandat' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}

    if (type !== undefined) {
      const validTypes = ['GESTION_COMPLETE', 'GESTION_LOCATION', 'MANDAT_SIMPLE']
      if (!validTypes.includes(type)) {
        return NextResponse.json({ error: 'Type de mandat invalide' }, { status: 400 })
      }
      updateData.type = type
    }

    if (commissionRate !== undefined) {
      const rate = parseFloat(String(commissionRate))
      if (isNaN(rate) || rate < 0 || rate > 100) {
        return NextResponse.json({ error: 'Le taux de commission doit être entre 0 et 100' }, { status: 400 })
      }
      updateData.commissionRate = rate
    }

    if (startDate !== undefined) {
      updateData.startDate = new Date(startDate)
    }

    if (endDate !== undefined) {
      updateData.endDate = new Date(endDate)
    }

    if (conditions !== undefined) {
      updateData.conditions = conditions
    }

    // Validate date consistency after update
    const finalStart = updateData.startDate ?? mandat.startDate
    const finalEnd = updateData.endDate ?? mandat.endDate
    if (new Date(finalStart) >= new Date(finalEnd)) {
      return NextResponse.json({ error: 'La date de début doit être antérieure à la date de fin' }, { status: 400 })
    }

    const updated = await db.mandat.update({
      where: { id },
      data: updateData,
      include: {
        property: { select: { id: true, title: true, city: true, address: true } },
        agency: { select: { id: true, firstName: true, lastName: true, email: true } },
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    })

    return NextResponse.json({ mandat: updated })
  } catch (error) {
    console.error('Update mandat error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
