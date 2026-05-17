import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

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

  const where: Record<string, unknown> = {}

  // Two modes:
  // Default: disputes where handledById === userId OR status === OPEN (unassigned)
  // ?mine=true: only disputes handled by this TC
  if (mine) {
    where.handledById = userId
  } else {
    where.OR = [
      { handledById: userId },
      { status: 'OPEN', handledById: null },
    ]
  }

  if (status) where.status = status
  if (type) where.type = type

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
// Update a dispute (status transitions, resolution, etc.)
export async function PATCH(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId } = auth

  try {
    const body = await request.json()
    const { id, status, resolution, tcComment } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: "L'identifiant du litige est requis" }, { status: 400 })
    }
    if (!status || !['OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED'].includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
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

    const currentStatus = dispute.status

    // Validate status transitions
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
    if (status === 'IN_REVIEW' && currentStatus === 'OPEN') {
      // TC takes the case — set handledById
    }

    if (status === 'RESOLVED' && currentStatus === 'IN_REVIEW') {
      if (!resolution || typeof resolution !== 'string' || !resolution.trim()) {
        return NextResponse.json(
          { error: 'Le texte de résolution est requis pour résoudre un litige' },
          { status: 400 }
        )
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = { status }

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

    // Use a transaction to update the dispute and create audit log + notification
    const [updated] = await db.$transaction([
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
            },
          },
          handledBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      // Create AuditLog entry
      db.auditLog.create({
        data: {
          userId,
          action: `DISPUTE_${status}`,
          entity: 'Dispute',
          entityId: id,
          details: JSON.stringify({
            fromStatus: currentStatus,
            toStatus: status,
            tcComment: tcComment?.trim() || null,
            hasResolution: !!resolution,
          }),
        },
      }),
      // Create Notification for the dispute reporter
      db.notification.create({
        data: {
          userId: dispute.reportedById,
          type: 'DOSSIER_UPDATE',
          title: 'Mise à jour de votre litige',
          message: `Le statut de votre litige a été mis à jour : ${currentStatus} → ${status}${
            tcComment ? `. Commentaire TC : ${tcComment.trim()}` : ''
          }`,
          actionUrl: `/tc/litiges`,
          entityId: id,
        },
      }),
    ])

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[TC Litiges PATCH] Error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
