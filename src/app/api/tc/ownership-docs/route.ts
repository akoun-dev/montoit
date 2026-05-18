import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'
import { notify } from '@/lib/notify'

// GET /api/tc/ownership-docs — List ownership documents for TC review
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
    const type = searchParams.get('type')
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')

    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 50
    const offset = offsetParam ? parseInt(offsetParam) : 0

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    } else {
      where.status = 'PENDING'
    }

    if (type) {
      where.type = type
    }

    const [docs, total] = await Promise.all([
      db.ownershipDocument.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              avatarUrl: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset,
      }),
      db.ownershipDocument.count({ where }),
    ])

    return NextResponse.json({
      docs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error('TC ownership docs GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH /api/tc/ownership-docs — Validate or reject ownership documents
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
    const { docIds, action, comment } = body

    if (!docIds || !Array.isArray(docIds) || docIds.length === 0) {
      return NextResponse.json({ error: 'docIds est requis (tableau non vide)' }, { status: 400 })
    }

    if (!action || !['APPROVE', 'REJECT', 'REQUEST_INFO'].includes(action)) {
      return NextResponse.json({ error: 'action doit être APPROVE, REJECT ou REQUEST_INFO' }, { status: 400 })
    }

    const results = []

    for (const docId of docIds) {
      const doc = await db.ownershipDocument.findUnique({
        where: { id: docId },
        include: { owner: true },
      })

      if (!doc) {
        results.push({ docId, success: false, error: 'Document introuvable' })
        continue
      }

      if (doc.status !== 'PENDING') {
        results.push({ docId, success: false, error: 'Ce document n\'est pas en attente de validation' })
        continue
      }

      let newStatus: string
      let auditAction: string
      let notificationTitle: string
      let notificationMessage: string

      if (action === 'APPROVE') {
        newStatus = 'VALIDATED'
        auditAction = 'OWNERSHIP_DOC_APPROVED'
        notificationTitle = 'Document de propriété validé'
        notificationMessage = `Votre document "${doc.name}" a été validé par le Tiers de Confiance.`
      } else if (action === 'REJECT') {
        newStatus = 'REJECTED'
        auditAction = 'OWNERSHIP_DOC_REJECTED'
        notificationTitle = 'Document de propriété rejeté'
        notificationMessage = `Votre document "${doc.name}" a été rejeté. Raison : ${comment || 'Non spécifié'}`
      } else {
        // REQUEST_INFO — keep as PENDING but add comment
        newStatus = 'PENDING'
        auditAction = 'OWNERSHIP_DOC_INFO_REQUESTED'
        notificationTitle = 'Document complémentaire requis'
        notificationMessage = `Le Tiers de Confiance demande un complément pour "${doc.name}" : ${comment || 'Veuillez fournir un document plus lisible.'}`
      }

      const updatedDoc = await db.ownershipDocument.update({
        where: { id: docId },
        data: {
          status: newStatus,
          reviewedById: userId,
          tcComment: comment || null,
        },
        include: {
          owner: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      })

      // Update SLA if exists
      await db.validationSLA.updateMany({
        where: { entityType: 'OWNER_PROFILE', entityId: docId },
        data: { completedAt: new Date(), isOverdue: false },
      })

      // Audit log
      await db.auditLog.create({
        data: {
          action: auditAction,
          entity: 'OwnershipDocument',
          entityId: docId,
          details: JSON.stringify({ action, comment, reviewerId: userId }),
          userId,
        },
      })

      // Notify the owner
      await notify({
        userId: doc.ownerId,
        type: 'DOSSIER_UPDATE',
        title: notificationTitle,
        message: notificationMessage,
        actionUrl: 'owner-file',
        entityId: docId,
      })

      results.push({ docId, success: true, doc: updatedDoc })
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('TC ownership docs PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
