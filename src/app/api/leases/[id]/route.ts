import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'
import crypto from 'crypto'
import { notify } from '@/lib/notify'

// GET /api/leases/[id] — Get a single lease detail (accessible by both tenant and owner)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const userId = authResult.userId

    const { id } = await params

    // Find the lease where user is either tenant or owner
    const lease = await db.lease.findFirst({
      where: {
        id,
        OR: [{ tenantId: userId }, { ownerId: userId }],
      },
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
            area: true,
            bedrooms: true,
            bathrooms: true,
            images: {
              orderBy: { order: 'asc' },
              take: 3,
              select: { url: true },
            },
          },
        },
        owner: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true, avatarUrl: true },
        },
        tenant: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true, avatarUrl: true },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            status: true,
            dueDate: true,
            paidAt: true,
            reference: true,
          },
          orderBy: { dueDate: 'desc' },
          take: 6,
        },
        maintenanceRequests: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })

    if (!lease) {
      return NextResponse.json({ error: 'Bail introuvable' }, { status: 404 })
    }

    return NextResponse.json({ data: lease })
  } catch (error) {
    console.error('Lease detail GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH /api/leases/[id] — Terminate a lease OR sign a lease
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

    // ─── Sign lease action ──────────────────────────────────────────────────
    if (body.action === 'sign') {
      const lease = await db.lease.findUnique({
        where: { id },
        include: {
          property: { select: { id: true, title: true } },
          owner: { select: { id: true, firstName: true, lastName: true } },
          tenant: { select: { id: true, firstName: true, lastName: true } },
        },
      })

      if (!lease) {
        return NextResponse.json({ error: 'Bail introuvable' }, { status: 404 })
      }

      // Auth check: must be tenant or owner of this lease
      if (lease.tenantId !== userId && lease.ownerId !== userId) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }

      // Validate lease is PENDING_SIGNATURE
      if (lease.status !== 'PENDING_SIGNATURE') {
        return NextResponse.json(
          { error: 'Ce bail ne peut pas être signé (statut: ' + lease.status + ')' },
          { status: 400 }
        )
      }

      // Generate a random OTP for audit trail
      const signOtp = crypto.randomBytes(16).toString('hex')
      const now = new Date()

      let updatedLease

      if (lease.tenantId === userId) {
        // Tenant signing
        if (lease.tenantSignedAt) {
          return NextResponse.json({ error: 'Vous avez déjà signé ce bail' }, { status: 400 })
        }
        updatedLease = await db.lease.update({
          where: { id },
          data: {
            tenantSignedAt: now,
            tenantSignOtp: signOtp,
            // If both parties have signed, activate the lease
            ...(lease.ownerSignedAt ? { status: 'ACTIVE' } : {}),
            updatedAt: now,
          },
          include: {
            property: { select: { id: true, title: true, address: true, city: true } },
            owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            tenant: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        })

        // Notify owner that tenant signed
        await notify({
          userId: lease.ownerId,
          type: 'LEASE_UPDATE',
          title: lease.ownerSignedAt ? 'Bail signé et activé' : 'Le locataire a signé le bail',
          message: lease.ownerSignedAt
            ? `Le bail pour "${lease.property.title}" est maintenant actif. Les deux parties ont signé.`
            : `${lease.tenant.firstName} ${lease.tenant.lastName} a signé le bail pour "${lease.property.title}".`,
          actionUrl: 'my-leases',
          entityId: lease.id,
        })
      } else {
        // Owner signing
        if (lease.ownerSignedAt) {
          return NextResponse.json({ error: 'Vous avez déjà signé ce bail' }, { status: 400 })
        }
        updatedLease = await db.lease.update({
          where: { id },
          data: {
            ownerSignedAt: now,
            ownerSignOtp: signOtp,
            // If both parties have signed, activate the lease
            ...(lease.tenantSignedAt ? { status: 'ACTIVE' } : {}),
            updatedAt: now,
          },
          include: {
            property: { select: { id: true, title: true, address: true, city: true } },
            owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            tenant: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        })

        // Notify tenant that owner signed
        await notify({
          userId: lease.tenantId,
          type: 'LEASE_UPDATE',
          title: lease.tenantSignedAt ? 'Bail signé et activé' : 'Le propriétaire a signé le bail',
          message: lease.tenantSignedAt
            ? `Le bail pour "${lease.property.title}" est maintenant actif. Les deux parties ont signé.`
            : `${lease.owner.firstName} ${lease.owner.lastName} a signé le bail pour "${lease.property.title}".`,
          actionUrl: 'my-leases',
          entityId: lease.id,
        })
      }

      // Audit log
      await db.auditLog.create({
        data: {
          action: lease.tenantId === userId ? 'LEASE_TENANT_SIGNED' : 'LEASE_OWNER_SIGNED',
          entity: 'Lease',
          entityId: id,
          details: JSON.stringify({
            signedBy: userId,
            role: lease.tenantId === userId ? 'TENANT' : 'OWNER',
            propertyTitle: lease.property.title,
            bothSigned: !!(updatedLease.tenantSignedAt && updatedLease.ownerSignedAt),
            newStatus: updatedLease.status,
          }),
          userId,
        },
      })

      return NextResponse.json({ data: updatedLease })
    }

    // ─── Modify lease terms action ──────────────────────────────────────────
    if (body.action === 'modify') {
      const lease = await db.lease.findUnique({
        where: { id },
        include: {
          property: { select: { id: true, title: true } },
          owner: { select: { id: true, firstName: true, lastName: true } },
          tenant: { select: { id: true, firstName: true, lastName: true } },
        },
      })

      if (!lease) {
        return NextResponse.json({ error: 'Bail introuvable' }, { status: 404 })
      }

      // Auth check: only owner can modify
      if (lease.ownerId !== userId) {
        return NextResponse.json({ error: 'Seul le propriétaire peut modifier le bail' }, { status: 403 })
      }

      // Only DRAFT or PENDING_SIGNATURE leases can be modified
      if (lease.status !== 'DRAFT' && lease.status !== 'PENDING_SIGNATURE') {
        return NextResponse.json(
          { error: 'Ce bail ne peut pas être modifié (statut: ' + lease.status + ')' },
          { status: 400 }
        )
      }

      // Build update data from allowed fields
      const updateData: Record<string, unknown> = { updatedAt: new Date() }
      if (body.monthlyRent !== undefined) updateData.monthlyRent = parseFloat(body.monthlyRent)
      if (body.charges !== undefined) updateData.charges = parseFloat(body.charges)
      if (body.deposit !== undefined) updateData.deposit = parseFloat(body.deposit)
      if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate)
      if (body.endDate !== undefined) updateData.endDate = new Date(body.endDate)
      if (body.specialConditions !== undefined) updateData.specialConditions = body.specialConditions

      const updatedLease = await db.lease.update({
        where: { id },
        data: updateData,
        include: {
          property: { select: { id: true, title: true, address: true, city: true } },
          owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          tenant: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      })

      // Notify tenant about modification
      await notify({
        userId: lease.tenantId,
        type: 'LEASE_UPDATE',
        title: 'Bail modifié',
        message: `Le bail pour "${lease.property.title}" a été modifié par le propriétaire. Veuillez vérifier les nouvelles conditions.`,
        actionUrl: 'my-leases',
        entityId: lease.id,
      })

      // Audit log
      await db.auditLog.create({
        data: {
          action: 'LEASE_MODIFIED',
          entity: 'Lease',
          entityId: id,
          details: JSON.stringify({
            modifiedBy: userId,
            fields: Object.keys(updateData).filter((k) => k !== 'updatedAt'),
            propertyTitle: lease.property.title,
          }),
          userId,
        },
      })

      return NextResponse.json({ data: updatedLease })
    }

    // ─── Terminate lease action ─────────────────────────────────────────────
    if (body.action !== 'terminate') {
      return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
    }

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

    return NextResponse.json({ data: updatedLease, terminatedAt: new Date().toISOString() })
  } catch (error) {
    console.error('Lease PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}


