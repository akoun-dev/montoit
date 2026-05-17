import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// PATCH /api/maintenance/[id] — Update a maintenance request (cancel)
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

    if (effectiveRole !== 'LOCATAIRE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { status } = body as { status?: string }

    // Only allow cancellation (status → CLOSED)
    if (status !== 'CLOSED') {
      return NextResponse.json(
        { error: 'Seul le statut CLOSED est autorisé via cette route' },
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
  } catch (error) {
    console.error('Maintenance PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
