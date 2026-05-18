import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'
import { notify } from '@/lib/notify'

// Helper: authenticate and authorize TC
async function authorizeTC(request: NextRequest) {
  const auth = await getUserIdAndRole(request)
  if (!auth) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  if (auth.effectiveRole !== 'TIERS_CONFIANCE')
    return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }
  return { userId: auth.userId }
}

// ─── GET ────────────────────────────────────────────────────────────────────────
// List disputes for TC management
export async function GET(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId } = auth

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const type = searchParams.get('type')
  const mine = searchParams.get('mine') === 'true'
  const priority = searchParams.get('priority')
  const isEscalated = searchParams.get('isEscalated')
  const resolved = searchParams.get('resolved') === 'true'

  const where: Record<string, unknown> = {}

  // Resolved history: RESOLVED + CLOSED disputes
  if (resolved) {
    where.status = { in: ['RESOLVED', 'CLOSED'] }
  } else if (mine) {
    where.handledById = userId
  } else {
    where.OR = [
      { handledById: userId },
      { status: 'OPEN', handledById: null },
    ]
  }

  if (status && !resolved) where.status = status
  if (type) where.type = type
  if (priority) where.priority = priority
  if (isEscalated !== null && isEscalated !== undefined && isEscalated !== '') {
    where.isEscalated = isEscalated === 'true'
  }

  const disputes = await db.dispute.findMany({
    where,
    include: {
      lease: {
        select: {
          id: true,
          startDate: true,
          endDate: true,
          monthlyRent: true,
          status: true,
          property: {
            select: {
              id: true,
              title: true,
              address: true,
              city: true,
              commune: true,
            },
          },
          tenant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
      reportedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
      handledBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(disputes)
}

// ─── PATCH ──────────────────────────────────────────────────────────────────────
// Update a dispute (status transitions, priority, escalation, investigation notes, evidence, etc.)
export async function PATCH(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId } = auth

  try {
    const body = await request.json()
    const {
      id, status, resolution, tcComment,
      priority, escalationReason,
      investigationNotes, evidenceUrls,
      action,
    } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: "L'identifiant du litige est requis" }, { status: 400 })
    }

    // Fetch the dispute
    const dispute = await db.dispute.findUnique({
      where: { id },
    })

    if (!dispute) {
      return NextResponse.json({ error: 'Litige introuvable' }, { status: 404 })
    }

    // If dispute is already handled by another TC and not the current user, deny access
    // Exception: if it's OPEN and unassigned, any TC can take it
    if (
      dispute.handledById &&
      dispute.handledById !== userId &&
      dispute.status !== 'OPEN'
    ) {
      return NextResponse.json(
        { error: 'Ce litige est déjà pris en charge par un autre TC' },
        { status: 403 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    // ─── ESCALATE action ──────────────────────────────────────────────────
    // Dedicated action: sets isEscalated=true, escalatedAt=now, escalationReason
    // Only for IN_REVIEW disputes
    if (action === 'ESCALATE') {
      if (dispute.status !== 'IN_REVIEW') {
        return NextResponse.json(
          { error: 'Seuls les litiges en cours de traitement peuvent être escaladés' },
          { status: 400 }
        )
      }
      updateData.isEscalated = true
      updateData.escalatedAt = new Date()
      updateData.escalationReason = escalationReason?.trim() || null
    }

    // ─── Status transition ─────────────────────────────────────────────
    if (status) {
      if (!['OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED'].includes(status)) {
        return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
      }

      const currentStatus = dispute.status
      const validTransitions: Record<string, string[]> = {
        OPEN: ['IN_REVIEW'],
        IN_REVIEW: ['RESOLVED', 'OPEN'],
        RESOLVED: ['CLOSED', 'OPEN'],
        CLOSED: ['OPEN'],
      }

      if (!validTransitions[currentStatus]?.includes(status)) {
        return NextResponse.json(
          { error: `Transition de statut invalide : ${currentStatus} → ${status}` },
          { status: 400 }
        )
      }

      // Additional validation per transition
      if (status === 'RESOLVED' && currentStatus === 'IN_REVIEW') {
        if (!resolution || typeof resolution !== 'string' || !resolution.trim()) {
          return NextResponse.json(
            { error: 'Le texte de résolution est requis pour résoudre un litige' },
            { status: 400 }
          )
        }
      }

      updateData.status = status

      // OPEN → IN_REVIEW: assign the TC
      if (status === 'IN_REVIEW' && currentStatus === 'OPEN') {
        updateData.handledById = userId
      }

      // Any → OPEN (reopen): clear resolvedById and handledById
      if (status === 'OPEN' && currentStatus !== 'OPEN') {
        updateData.handledById = null
      }

      if (resolution !== undefined) updateData.resolution = resolution.trim()
      if (tcComment !== undefined) updateData.tcComment = tcComment?.trim() || null
    }

    // ─── Priority update ────────────────────────────────────────────────
    if (priority !== undefined) {
      if (!['NORMAL', 'HIGH', 'URGENT'].includes(priority)) {
        return NextResponse.json({ error: 'Priorité invalide (NORMAL, HIGH, URGENT)' }, { status: 400 })
      }
      updateData.priority = priority
    }

    // ─── Investigation notes ────────────────────────────────────────────
    if (investigationNotes !== undefined) {
      updateData.investigationNotes = investigationNotes?.trim() || null
    }

    // ─── Evidence URLs ──────────────────────────────────────────────────
    if (evidenceUrls !== undefined) {
      if (Array.isArray(evidenceUrls)) {
        // Merge with existing URLs
        const existingUrls: string[] = JSON.parse(dispute.evidenceUrls || '[]')
        const newUrls = evidenceUrls.filter((u: string) => !existingUrls.includes(u))
        updateData.evidenceUrls = JSON.stringify([...existingUrls, ...newUrls])
      } else if (typeof evidenceUrls === 'string' && evidenceUrls === 'RESET') {
        updateData.evidenceUrls = '[]'
      }
    }

    // ─── TC Comment (standalone update) ─────────────────────────────────
    if (tcComment !== undefined && !status) {
      updateData.tcComment = tcComment?.trim() || null
    }

    // ─── Resolution (standalone update) ─────────────────────────────────
    if (resolution !== undefined && !status) {
      updateData.resolution = resolution?.trim() || null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Aucune donnée à mettre à jour' }, { status: 400 })
    }

    // Determine audit action
    let auditAction = 'DISPUTE_UPDATED'
    if (action === 'ESCALATE') auditAction = 'DISPUTE_ESCALATED'
    else if (status) auditAction = `DISPUTE_${status}`

    // Use a transaction to update the dispute and create audit log + notification
    const transactionOps: Promise<unknown>[] = [
      db.dispute.update({
        where: { id },
        data: updateData,
        include: {
          lease: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
              monthlyRent: true,
              status: true,
              property: {
                select: {
                  id: true,
                  title: true,
                  address: true,
                  city: true,
                  commune: true,
                },
              },
              tenant: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              owner: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          reportedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          handledBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      // Create AuditLog entry
      db.auditLog.create({
        data: {
          userId,
          action: auditAction,
          entity: 'Dispute',
          entityId: id,
          details: JSON.stringify({
            fromStatus: dispute.status,
            toStatus: status || dispute.status,
            priority,
            escalated: action === 'ESCALATE',
            escalationReason: action === 'ESCALATE' ? escalationReason : undefined,
            hasInvestigationNotes: !!investigationNotes,
            hasEvidence: !!evidenceUrls,
            tcComment: tcComment?.trim() || null,
            hasResolution: !!resolution,
          }),
        },
      }),
    ]

    // Create Notification for the dispute reporter (for status changes and escalations)
    let notifData: { userId: string; type: string; title: string; message: string; actionUrl: string; entityId: string } | null = null
    if (status || action === 'ESCALATE') {
      const notifMessage = action === 'ESCALATE'
        ? `Votre litige a été escaladé. ${escalationReason ? `Raison : ${escalationReason.trim()}` : ''}`
        : `Le statut de votre litige a été mis à jour : ${dispute.status} → ${status}${
            tcComment ? `. Commentaire TC : ${tcComment.trim()}` : ''
          }`

      notifData = {
        userId: dispute.reportedById,
        type: 'DOSSIER_UPDATE',
        title: action === 'ESCALATE' ? 'Litige escaladé' : 'Mise à jour de votre litige',
        message: notifMessage,
        actionUrl: 'litiges',
        entityId: id,
      }

      transactionOps.push(
        db.notification.create({
          data: notifData,
        })
      )
    }

    const [updated] = await db.$transaction(transactionOps) as [typeof dispute, ...unknown[]]

    // Push notification via WebSocket after transaction (best-effort)
    if (notifData) {
      try {
        await fetch('http://localhost:3003/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notifData),
        })
      } catch {
        // WebSocket push is best-effort
      }
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[TC Litiges PATCH] Error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
