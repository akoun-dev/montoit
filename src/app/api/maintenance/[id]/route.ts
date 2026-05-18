import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// Valid status transitions for PROPRIETAIRE/AGENCE
const OWNER_ALLOWED_STATUSES = ['IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const
const VALID_STATUSES = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const

// PATCH /api/maintenance/[id] — Update a maintenance request
// LOCATAIRE: can cancel (CLOSED) only if PENDING
// PROPRIETAIRE/AGENCE: can change status to IN_PROGRESS, RESOLVED, CLOSED;
//   add resolution text; reject (CLOSED with reason); add comment
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

      // Find the maintenance request — must belong to this tenant
      const maintenanceRequest = await db.maintenanceRequest.findFirst({
        where: { id, tenantId: userId },
      })

      if (!maintenanceRequest) {
        return NextResponse.json(
          { error: 'Demande introuvable ou accès refusé' },
          { status: 404 }
        )
      }

      // Only allow cancellation if still PENDING
      if (maintenanceRequest.status !== 'PENDING') {
        return NextResponse.json(
          { error: 'Seules les demandes en attente peuvent être annulées' },
          { status: 400 }
        )
      }

      const updated = await db.maintenanceRequest.update({
        where: { id },
        data: { status: 'CLOSED' },
        include: {
          lease: {
            select: {
              id: true,
              property: {
                select: {
                  id: true,
                  title: true,
                  address: true,
                  city: true,
                  images: {
                    orderBy: { order: 'asc' },
                    take: 1,
                    select: { url: true },
                  },
                },
              },
            },
          },
          comments: {
            orderBy: { createdAt: 'asc' },
            include: {
              author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            },
          },
        },
      })

      // Create audit log
      await db.auditLog.create({
        data: {
          action: 'UPDATE',
          entity: 'MaintenanceRequest',
          entityId: id,
          details: `Demande de maintenance annulée: ${maintenanceRequest.title}`,
          userId,
        },
      })

      return NextResponse.json({ data: updated })
    }

    // ─── PROPRIETAIRE / AGENCE: full status management ───────────────────────
    if (effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Validate that the maintenance request belongs to a lease on a property owned by this user
    const maintenanceRequest = await db.maintenanceRequest.findFirst({
      where: { id, lease: { ownerId: userId } },
    })

    if (!maintenanceRequest) {
      return NextResponse.json(
        { error: 'Demande introuvable ou accès refusé' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    const auditDetails: string[] = []

    // Validate and apply status change
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

      // Validate status transition order
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

    // Apply resolution text
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

    // Apply rejection (sets status to CLOSED with reason stored in resolution)
    if (rejectionReason !== undefined) {
      if (typeof rejectionReason !== 'string' || rejectionReason.trim().length === 0) {
        return NextResponse.json(
          { error: 'La raison du rejet ne peut pas être vide' },
          { status: 400 }
        )
      }

      // Rejection always sets status to CLOSED
      updateData.status = 'CLOSED'
      updateData.resolution = `[REJETÉ] ${rejectionReason.trim()}`
      auditDetails.push(`rejeté: ${rejectionReason.trim()}`)
    }

    // Must have at least one update
    if (Object.keys(updateData).length === 0 && comment === undefined) {
      return NextResponse.json(
        { error: 'Aucune donnée à mettre à jour. Fournissez status, resolution, rejectionReason ou comment.' },
        { status: 400 }
      )
    }

    const updated = await db.maintenanceRequest.update({
      where: { id },
      data: updateData,
      include: {
        lease: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            monthlyRent: true,
            property: {
              select: {
                id: true,
                title: true,
                address: true,
                city: true,
                images: {
                  orderBy: { order: 'asc' },
                  take: 1,
                  select: { url: true },
                },
              },
            },
            owner: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    })

    // Create a comment if the owner provided one
    if (comment !== undefined && typeof comment === 'string' && comment.trim().length > 0) {
      await db.maintenanceComment.create({
        data: {
          content: comment.trim(),
          maintenanceRequestId: id,
          authorId: userId,
        },
      })

      // Re-fetch to include the new comment
      const refetched = await db.maintenanceRequest.findUnique({
        where: { id },
        include: {
          lease: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
              monthlyRent: true,
              property: {
                select: {
                  id: true,
                  title: true,
                  address: true,
                  city: true,
                  images: {
                    orderBy: { order: 'asc' },
                    take: 1,
                    select: { url: true },
                  },
                },
              },
              owner: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
          comments: {
            orderBy: { createdAt: 'asc' },
            include: {
              author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            },
          },
        },
      })

      // Notify tenant about the update
      await db.notification.create({
        data: {
          userId: maintenanceRequest.tenantId,
          type: 'DOSSIER_UPDATE',
          title: 'Mise à jour de votre demande de maintenance',
          message: `Votre demande "${maintenanceRequest.title}" a été mise à jour par le propriétaire.`,
          entityId: id,
        },
      })

      // Create audit log
      await db.auditLog.create({
        data: {
          action: 'UPDATE',
          entity: 'MaintenanceRequest',
          entityId: id,
          details: `Demande de maintenance mise à jour: ${auditDetails.join(', ')}${comment ? ' ; commentaire ajouté' : ''}`,
          userId,
        },
      })

      return NextResponse.json({ data: refetched })
    }

    // Notify tenant about the status change (even without comment)
    if (Object.keys(updateData).length > 0) {
      await db.notification.create({
        data: {
          userId: maintenanceRequest.tenantId,
          type: 'DOSSIER_UPDATE',
          title: 'Mise à jour de votre demande de maintenance',
          message: `Votre demande "${maintenanceRequest.title}" a été mise à jour par le propriétaire.`,
          entityId: id,
        },
      })

      // Create audit log
      await db.auditLog.create({
        data: {
          action: 'UPDATE',
          entity: 'MaintenanceRequest',
          entityId: id,
          details: `Demande de maintenance mise à jour: ${auditDetails.join(', ')}`,
          userId,
        },
      })
    }

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Maintenance PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
