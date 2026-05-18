import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/session'
import { notify } from '@/lib/notify'

// PATCH /api/leases/[id]/terminate — Terminate a lease
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params

    // Find the lease and verify ownership/tenancy
    const lease = await db.lease.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            city: true,
            images: { orderBy: { order: 'asc' }, take: 1 },
          },
        },
        owner: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        tenant: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    })

    if (!lease) {
      return NextResponse.json({ error: 'Bail introuvable' }, { status: 404 })
    }

    // Auth check: only tenant or owner of the lease can terminate
    if (lease.tenantId !== userId && lease.ownerId !== userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Validate lease is ACTIVE
    if (lease.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Seul un bail actif peut être résilié' },
        { status: 400 }
      )
    }

    // Update lease status to TERMINATED
    const updatedLease = await db.lease.update({
      where: { id },
      data: {
        status: 'TERMINATED',
        updatedAt: new Date(),
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            city: true,
            images: { orderBy: { order: 'asc' }, take: 1 },
          },
        },
        owner: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        tenant: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    })

    // Log audit event
    await db.auditLog.create({
      data: {
        action: 'LEASE_TERMINATED',
        entity: 'Lease',
        entityId: id,
        details: JSON.stringify({
          terminatedBy: userId,
          role: lease.tenantId === userId ? 'TENANT' : 'OWNER',
          propertyTitle: lease.property.title,
        }),
        userId,
      },
    })

    // Notify both parties about lease termination
    const terminatedBy = lease.tenantId === userId ? 'le locataire' : 'le propriétaire'
    await Promise.all([
      notify({
        userId: lease.tenantId,
        type: 'LEASE_UPDATE',
        title: 'Bail résilié',
        message: `Le bail pour "${lease.property.title}" a été résilié par ${terminatedBy}.`,
        actionUrl: 'my-leases',
        entityId: id,
      }),
      notify({
        userId: lease.ownerId,
        type: 'LEASE_UPDATE',
        title: 'Bail résilié',
        message: `Le bail pour "${lease.property.title}" a été résilié par ${terminatedBy}.`,
        actionUrl: 'my-leases',
        entityId: id,
      }),
    ])

    return NextResponse.json({ data: updatedLease, terminatedAt: new Date().toISOString() })
  } catch (error) {
    console.error('Lease terminate error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
