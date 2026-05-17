import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'
import crypto from 'crypto'

// POST /api/leases/[id]/sign — Sign a lease electronically with OTP verification
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId } = authResult

    const { id } = await params
    const body = await req.json()
    const { otpCode } = body

    if (!otpCode) {
      return NextResponse.json({ error: 'Code OTP requis' }, { status: 400 })
    }

    // ─── Find the lease ───────────────────────────────────────────────────
    const lease = await db.lease.findUnique({
      where: { id },
      include: {
        property: { select: { id: true, title: true, address: true, city: true } },
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        tenant: { select: { id: true, firstName: true, lastName: true, email: true } },
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

    // ─── Verify OTP ───────────────────────────────────────────────────────
    const otpRecord = await db.oTPCode.findFirst({
      where: {
        userId,
        type: 'BAIL_SIGNATURE',
        code: otpCode,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    })

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'Code OTP invalide ou expiré' },
        { status: 400 }
      )
    }

    // Mark OTP as used
    await db.oTPCode.update({
      where: { id: otpRecord.id },
      data: { isUsed: true },
    })

    // ─── Apply signature ──────────────────────────────────────────────────
    const now = new Date()
    const signOtp = crypto.randomBytes(16).toString('hex')

    let updatedLease

    if (lease.ownerId === userId) {
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
          property: { select: { id: true, title: true, address: true, city: true, images: { orderBy: { order: 'asc' }, take: 1 } } },
          owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          tenant: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      })

      // Notify tenant
      await db.notification.create({
        data: {
          userId: lease.tenantId,
          type: 'DOSSIER_UPDATE',
          title: lease.tenantSignedAt ? 'Bail signé et activé' : 'Le propriétaire a signé le bail',
          message: lease.tenantSignedAt
            ? `Le bail pour "${lease.property.title}" est maintenant actif. Les deux parties ont signé.`
            : `${lease.owner.firstName} ${lease.owner.lastName} a signé le bail pour "${lease.property.title}". Votre signature est attendue.`,
          entityId: lease.id,
        },
      })
    } else {
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
          property: { select: { id: true, title: true, address: true, city: true, images: { orderBy: { order: 'asc' }, take: 1 } } },
          owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          tenant: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      })

      // Notify owner
      await db.notification.create({
        data: {
          userId: lease.ownerId,
          type: 'DOSSIER_UPDATE',
          title: lease.ownerSignedAt ? 'Bail signé et activé' : 'Le locataire a signé le bail',
          message: lease.ownerSignedAt
            ? `Le bail pour "${lease.property.title}" est maintenant actif. Les deux parties ont signé.`
            : `${lease.tenant.firstName} ${lease.tenant.lastName} a signé le bail pour "${lease.property.title}".`,
          entityId: lease.id,
        },
      })
    }

    // ─── Audit log ────────────────────────────────────────────────────────
    await db.auditLog.create({
      data: {
        action: lease.ownerId === userId ? 'LEASE_OWNER_SIGNED' : 'LEASE_TENANT_SIGNED',
        entity: 'Lease',
        entityId: id,
        details: JSON.stringify({
          signedBy: userId,
          role: lease.ownerId === userId ? 'OWNER' : 'TENANT',
          propertyTitle: lease.property.title,
          bothSigned: !!(updatedLease.ownerSignedAt && updatedLease.tenantSignedAt),
          newStatus: updatedLease.status,
        }),
        userId,
      },
    })

    return NextResponse.json({ data: updatedLease })
  } catch (error) {
    console.error('Lease sign error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
