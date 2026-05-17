import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// GET /api/tc/rental-files — List rental files for TC review
export async function GET(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { effectiveRole } = authResult

    if (effectiveRole !== 'TIERS_CONFIANCE') {
      return NextResponse.json({ error: 'Accès refusé — rôle TIERS_CONFIANCE requis' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')

    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 50
    const offset = offsetParam ? parseInt(offsetParam) : 0

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    } else {
      // Default: show files that need TC attention
      where.status = { in: ['SUBMITTED', 'TC_REVIEW'] }
    }

    if (search) {
      where.OR = [
        { tenant: { firstName: { contains: search } } },
        { tenant: { lastName: { contains: search } } },
        { tenant: { phone: { contains: search } } },
        { tenant: { email: { contains: search } } },
      ]
    }

    const [files, total] = await Promise.all([
      db.rentalFile.findMany({
        where,
        include: {
          tenant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              avatarUrl: true,
            },
          },
          documents: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset,
      }),
      db.rentalFile.count({ where }),
    ])

    return NextResponse.json({
      files,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error('TC rental files GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH /api/tc/rental-files — Validate or reject a rental file
export async function PATCH(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'TIERS_CONFIANCE') {
      return NextResponse.json({ error: 'Accès refusé — rôle TIERS_CONFIANCE requis' }, { status: 403 })
    }

    const body = await req.json()
    const { fileIds, action, comment, documentUpdates } = body

    // Support both single file and batch operations
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: 'fileIds est requis (tableau non vide)' }, { status: 400 })
    }

    if (!action || !['APPROVE', 'REJECT', 'REQUEST_INFO'].includes(action)) {
      return NextResponse.json({ error: 'action doit être APPROVE, REJECT ou REQUEST_INFO' }, { status: 400 })
    }

    const results = []

    for (const fileId of fileIds) {
      const file = await db.rentalFile.findUnique({
        where: { id: fileId },
        include: { tenant: true, documents: true },
      })

      if (!file) {
        results.push({ fileId, success: false, error: 'Dossier introuvable' })
        continue
      }

      if (file.status !== 'SUBMITTED' && file.status !== 'TC_REVIEW') {
        results.push({ fileId, success: false, error: 'Ce dossier n\'est pas en attente de vérification' })
        continue
      }

      let newStatus: string
      let auditAction: string
      let notificationTitle: string
      let notificationMessage: string

      if (action === 'APPROVE') {
        newStatus = 'VALIDATED'
        auditAction = 'RENTAL_FILE_APPROVED'
        notificationTitle = 'Dossier validé'
        notificationMessage = `Votre dossier locatif a été validé par le Tiers de Confiance.`
      } else if (action === 'REJECT') {
        newStatus = 'REJECTED'
        auditAction = 'RENTAL_FILE_REJECTED'
        notificationTitle = 'Dossier rejeté'
        notificationMessage = `Votre dossier locatif a été rejeté. Raison : ${comment || 'Non spécifié'}`
      } else {
        // REQUEST_INFO — move to TC_REVIEW and add comment
        newStatus = 'TC_REVIEW'
        auditAction = 'RENTAL_FILE_INFO_REQUESTED'
        notificationTitle = 'Documents complémentaires requis'
        notificationMessage = `Le Tiers de Confiance demande des documents complémentaires : ${comment || 'Veuillez compléter votre dossier.'}`
      }

      // Update document statuses if provided
      if (documentUpdates && Array.isArray(documentUpdates)) {
        for (const docUpdate of documentUpdates) {
          if (docUpdate.documentId && docUpdate.status) {
            await db.rentalFileDocument.update({
              where: { id: docUpdate.documentId },
              data: {
                status: docUpdate.status,
                tcComment: docUpdate.comment || null,
              },
            })
          }
        }
      }

      // Update the rental file
      const updatedFile = await db.rentalFile.update({
        where: { id: fileId },
        data: {
          status: newStatus,
          reviewedById: userId,
          reviewedAt: new Date(),
          tcComment: comment || null,
          rejectionReason: action === 'REJECT' ? (comment || 'Non spécifié') : null,
        },
        include: {
          tenant: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          documents: true,
        },
      })

      // Update SLA if exists
      await db.validationSLA.updateMany({
        where: { entityType: 'RENTAL_FILE', entityId: fileId },
        data: { completedAt: new Date(), isOverdue: false },
      })

      // Audit log
      await db.auditLog.create({
        data: {
          action: auditAction,
          entity: 'RentalFile',
          entityId: fileId,
          details: JSON.stringify({ action, comment, reviewerId: userId }),
          userId,
        },
      })

      // Notify the tenant
      await db.notification.create({
        data: {
          type: 'DOSSIER_UPDATE',
          title: notificationTitle,
          message: notificationMessage,
          entityId: fileId,
          userId: file.tenantId,
        },
      })

      results.push({ fileId, success: true, file: updatedFile })
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('TC rental files PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
