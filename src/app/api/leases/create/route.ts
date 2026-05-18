import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'
import crypto from 'crypto'
import { notify } from '@/lib/notify'

// POST /api/leases/create — Create a new lease from a validated rental file
export async function POST(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await req.json()
    const {
      rentalFileId,
      propertyId,
      tenantId,
      monthlyRent,
      charges,
      deposit,
      startDate,
      endDate,
      specialConditions,
    } = body

    // ─── Validate required fields ─────────────────────────────────────────
    if (!rentalFileId || !propertyId || !tenantId || !monthlyRent || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Champs requis manquants: rentalFileId, propertyId, tenantId, monthlyRent, startDate, endDate' },
        { status: 400 }
      )
    }

    // ─── Verify the owner owns the property ───────────────────────────────
    const property = await db.property.findFirst({
      where: { id: propertyId, ownerId: userId },
    })
    if (!property) {
      return NextResponse.json(
        { error: 'Vous n\'êtes pas propriétaire de ce bien ou le bien n\'existe pas' },
        { status: 403 }
      )
    }

    // ─── Verify the rental file is VALIDATED ──────────────────────────────
    const rentalFile = await db.rentalFile.findFirst({
      where: { id: rentalFileId, status: 'VALIDATED' },
      include: {
        tenant: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    })
    if (!rentalFile) {
      return NextResponse.json(
        { error: 'Le dossier locatif n\'est pas validé ou n\'existe pas' },
        { status: 400 }
      )
    }

    // Verify the rental file belongs to the tenant
    if (rentalFile.tenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Le dossier locatif ne correspond pas au locataire sélectionné' },
        { status: 400 }
      )
    }

    // ─── Check for existing active/pending lease for same property+tenant ─
    const existingLease = await db.lease.findFirst({
      where: {
        propertyId,
        tenantId,
        status: { in: ['DRAFT', 'PENDING_SIGNATURE', 'ACTIVE'] },
      },
    })
    if (existingLease) {
      return NextResponse.json(
        { error: 'Un bail actif ou en attente existe déjà pour ce locataire et ce bien' },
        { status: 400 }
      )
    }

    // ─── Generate OTP code for owner signature ────────────────────────────
    const otpCode = crypto.randomInt(100000, 999999).toString()
    const otpExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // ─── Create the lease ─────────────────────────────────────────────────
    const lease = await db.lease.create({
      data: {
        status: 'PENDING_SIGNATURE',
        propertyId,
        tenantId,
        ownerId: userId,
        rentalFileId,
        monthlyRent: parseFloat(monthlyRent),
        charges: charges ? parseFloat(charges) : 0,
        deposit: deposit ? parseFloat(deposit) : 0,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        specialConditions: specialConditions || null,
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
        tenant: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true },
        },
        owner: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    })

    // ─── Create OTPCode record for owner signature ────────────────────────
    await db.oTPCode.create({
      data: {
        code: otpCode,
        type: 'BAIL_SIGNATURE',
        email: lease.tenant.email,
        expiresAt: otpExpiry,
        userId,
      },
    })

    // ─── Send notification to tenant about new lease awaiting signature ───
    await notify({
      userId: tenantId,
      type: 'LEASE_UPDATE',
      title: 'Nouveau bail en attente de signature',
      message: `Un nouveau bail pour "${property.title}" a été créé. Veuillez le consulter pour le signer.`,
      actionUrl: 'my-leases',
      entityId: lease.id,
    })

    // ─── Audit log ────────────────────────────────────────────────────────
    await db.auditLog.create({
      data: {
        action: 'LEASE_CREATED',
        entity: 'Lease',
        entityId: lease.id,
        details: JSON.stringify({
          propertyId,
          tenantId,
          ownerId: userId,
          monthlyRent: parseFloat(monthlyRent),
          propertyTitle: property.title,
        }),
        userId,
      },
    })

    return NextResponse.json({
      data: lease,
      otpCode, // Return OTP for the owner to sign
    })
  } catch (error) {
    console.error('Lease create error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
