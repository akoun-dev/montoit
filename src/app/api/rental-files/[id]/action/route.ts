import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'
import { notify } from '@/lib/notify'

// POST /api/rental-files/[id]/action — Accept or reject a rental file
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { action, rejectionReason } = body as {
      action: 'accept' | 'reject'
      rejectionReason?: string
    }

    if (!action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action invalide. Utilisez "accept" ou "reject"' },
        { status: 400 }
      )
    }

    // Find the rental file
    const rentalFile = await db.rentalFile.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, firstName: true, lastName: true } },
        leases: {
          include: {
            property: { select: { id: true, ownerId: true, title: true } },
          },
        },
      },
    })

    if (!rentalFile) {
      return NextResponse.json(
        { error: 'Dossier locatif introuvable' },
        { status: 404 }
      )
    }

    // Verify the owner owns at least one property linked via leases
    const ownerLease = rentalFile.leases.find(
      (l) => l.property.ownerId === userId
    )
    if (!ownerLease) {
      return NextResponse.json(
        { error: 'Vous n\'êtes pas autorisé à traiter ce dossier' },
        { status: 403 }
      )
    }

    // Check current status — can only act on VALIDATED (by TC) files
    if (rentalFile.status !== 'VALIDATED' && rentalFile.status !== 'SUBMITTED' && rentalFile.status !== 'TC_REVIEW') {
      return NextResponse.json(
        { error: 'Ce dossier ne peut plus être traité' },
        { status: 400 }
      )
    }

    if (action === 'accept') {
      // Accept the rental file — set status to VALIDATED if not already
      // and create a lease draft
      const updatedFile = await db.rentalFile.update({
        where: { id },
        data: {
          status: 'VALIDATED',
        },
      })

      // Create a lease draft linked to this rental file
      const property = ownerLease.property
      const lease = await db.lease.create({
        data: {
          status: 'DRAFT',
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year default
          monthlyRent: 0, // Owner will fill this in
          charges: 0,
          deposit: 0,
          propertyId: property.id,
          tenantId: rentalFile.tenantId,
          ownerId: userId,
          rentalFileId: rentalFile.id,
        },
      })

      // Notify the tenant
      await notify({
        userId: rentalFile.tenantId,
        type: 'DOSSIER_UPDATE',
        title: 'Dossier accepté',
        message: `Votre dossier locatif pour "${property.title}" a été accepté par le propriétaire.`,
        actionUrl: 'rental-file',
        entityId: rentalFile.id,
      })

      // Audit log
      await db.auditLog.create({
        data: {
          action: 'ACCEPT_RENTAL_FILE',
          entity: 'RentalFile',
          entityId: rentalFile.id,
          details: `Dossier accepté par le propriétaire ${userId}. Bail brouillon créé: ${lease.id}`,
          userId,
        },
      })

      return NextResponse.json({
        data: { rentalFile: updatedFile, lease },
        message: 'Dossier accepté et brouillon de bail créé',
      })
    }

    if (action === 'reject') {
      if (!rejectionReason || rejectionReason.trim().length === 0) {
        return NextResponse.json(
          { error: 'Veuillez fournir une raison de refus' },
          { status: 400 }
        )
      }

      const updatedFile = await db.rentalFile.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason: rejectionReason.trim(),
        },
      })

      // Notify the tenant
      const property = ownerLease.property
      await notify({
        userId: rentalFile.tenantId,
        type: 'DOSSIER_UPDATE',
        title: 'Dossier refusé',
        message: `Votre dossier locatif pour "${property.title}" a été refusé. Raison : ${rejectionReason.trim()}`,
        actionUrl: 'rental-file',
        entityId: rentalFile.id,
      })

      // Audit log
      await db.auditLog.create({
        data: {
          action: 'REJECT_RENTAL_FILE',
          entity: 'RentalFile',
          entityId: rentalFile.id,
          details: `Dossier refusé par le propriétaire ${userId}. Raison: ${rejectionReason.trim()}`,
          userId,
        },
      })

      return NextResponse.json({
        data: { rentalFile: updatedFile },
        message: 'Dossier refusé',
      })
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
  } catch (error) {
    console.error('Rental file action error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
