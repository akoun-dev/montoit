import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'
import { notify } from '@/lib/notify'

// GET /api/tc/rental-files — List rental files for TC review
export async function GET(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { effectiveRole } = authResult

    if (effectiveRole !== 'TIERS_CONFIANCE' && effectiveRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé — rôle TIERS_CONFIANCE ou ADMIN requis' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const priority = searchParams.get('priority')
    const onHold = searchParams.get('onHold')
    const overdue = searchParams.get('overdue') === 'true'
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')

    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 50
    const offset = offsetParam ? parseInt(offsetParam) : 0

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    } else if (!overdue) {
      // Default: show files that need TC attention (unless filtering overdue)
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

    if (priority) {
      where.priority = priority
    }

    if (onHold === 'true') {
      where.onHold = true
    } else if (onHold === 'false') {
      where.onHold = false
    }

    // Overdue: files with SLA that is overdue and not completed
    if (overdue) {
      where.validationSLAs = {
        some: {
          isOverdue: true,
          completedAt: null,
        },
      }
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

    // Also fetch SLA data for overdue detection
    const fileIds = files.map((f) => f.id)
    const slas = await db.validationSLA.findMany({
      where: {
        entityType: 'RENTAL_FILE',
        entityId: { in: fileIds },
        isOverdue: true,
        completedAt: null,
      },
      select: {
        id: true,
        entityId: true,
        submittedAt: true,
        deadlineAt: true,
        isOverdue: true,
      },
    })

    const slaMap = new Map(slas.map((s) => [s.entityId, s]))

    // Attach SLA data to files
    const filesWithSla = files.map((f) => ({
      ...f,
      sla: slaMap.get(f.id) || null,
    }))

    return NextResponse.json({
      files: filesWithSla,
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

// PATCH /api/tc/rental-files — Validate, reject, request-info, or update priority/onHold
export async function PATCH(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    if (effectiveRole !== 'TIERS_CONFIANCE' && effectiveRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé — rôle TIERS_CONFIANCE ou ADMIN requis' }, { status: 403 })
    }

    const body = await req.json()
    const { fileIds, action, comment, documentUpdates, priority, onHold, onHoldReason, id } = body

    // ─── Single file update: priority / onHold ──────────────────────────
    if (id && !fileIds) {
      const file = await db.rentalFile.findUnique({ where: { id } })
      if (!file) {
        return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
      }

      const updateData: Record<string, unknown> = {}

      if (priority !== undefined) {
        if (!['NORMAL', 'HIGH', 'URGENT'].includes(priority)) {
          return NextResponse.json({ error: 'Priorité invalide' }, { status: 400 })
        }
        updateData.priority = priority
      }

      if (onHold !== undefined) {
        updateData.onHold = Boolean(onHold)
        if (onHold) {
          updateData.onHoldReason = onHoldReason?.trim() || null
        } else {
          updateData.onHoldReason = null
        }
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'Aucune donnée à mettre à jour' }, { status: 400 })
      }

      const updated = await db.rentalFile.update({
        where: { id },
        data: updateData,
        include: {
          tenant: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          documents: true,
        },
      })

      // Audit log
      await db.auditLog.create({
        data: {
          action: priority ? 'RENTAL_FILE_PRIORITY_CHANGED' : onHold ? 'RENTAL_FILE_PUT_ON_HOLD' : 'RENTAL_FILE_RESUMED',
          entity: 'RentalFile',
          entityId: id,
          details: JSON.stringify({ priority, onHold, onHoldReason }),
          userId,
        },
      })

      return NextResponse.json({ success: true, file: updated })
    }

    // ─── Batch action: APPROVE / REJECT / REQUEST_INFO ──────────────────
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
      await notify({
        userId: file.tenantId,
        type: 'DOSSIER_UPDATE',
        title: notificationTitle,
        message: notificationMessage,
        actionUrl: 'rental-file',
        entityId: fileId,
      })

      results.push({ fileId, success: true, file: updatedFile })
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('TC rental files PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
