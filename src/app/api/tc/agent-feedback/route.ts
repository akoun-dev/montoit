import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// Helper: authenticate and authorize TC
async function authorizeTC(request: NextRequest) {
  const auth = await getUserIdAndRole(request)
  if (!auth) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  if (auth.effectiveRole !== 'TIERS_CONFIANCE')
    return { error: NextResponse.json({ error: 'Accès refusé — rôle TIERS_CONFIANCE requis' }, { status: 403 }) }
  return { userId: auth.userId }
}

// ─── GET ────────────────────────────────────────────────────────────────────────
// List feedback for agents under this TC (filter by agentId)
export async function GET(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId: tcUserId } = auth

  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agentId')
  const limitParam = searchParams.get('limit')
  const offsetParam = searchParams.get('offset')

  const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 50
  const offset = offsetParam ? parseInt(offsetParam) : 0

  const where: Record<string, unknown> = {
    tcId, // Only show feedback given by this TC
  }

  if (agentId) where.agentId = agentId

  // Verify the agent belongs to this TC if agentId filter provided
  if (agentId) {
    const agent = await db.verificationAgent.findUnique({
      where: { id: agentId },
      select: { tcId: true },
    })
    if (!agent || agent.tcId !== tcUserId) {
      return NextResponse.json({ error: 'Cet agent ne vous appartient pas' }, { status: 403 })
    }
  }

  const [feedbacks, total] = await Promise.all([
    db.agentFeedback.findMany({
      where,
      include: {
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
        tc: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.agentFeedback.count({ where }),
  ])

  return NextResponse.json({
    feedbacks,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  })
}

// ─── POST ───────────────────────────────────────────────────────────────────────
// Create feedback (agentId, rating 1-5, comment?) — only TIERS_CONFIANCE
export async function POST(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId: tcUserId } = auth

  try {
    const body = await request.json()
    const { agentId, rating, comment } = body

    // Validate required fields
    if (!agentId || typeof agentId !== 'string') {
      return NextResponse.json({ error: "L'identifiant de l'agent est requis" }, { status: 400 })
    }
    if (typeof rating !== 'number' || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json({ error: 'La note doit être un entier entre 1 et 5' }, { status: 400 })
    }

    // Validate agent belongs to this TC
    const agent = await db.verificationAgent.findUnique({
      where: { id: agentId },
    })
    if (!agent) {
      return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 })
    }
    if (agent.tcId !== tcUserId) {
      return NextResponse.json({ error: 'Cet agent ne vous appartient pas' }, { status: 403 })
    }

    const feedback = await db.agentFeedback.create({
      data: {
        agentId,
        tcId: tcUserId,
        rating,
        comment: comment?.trim() || null,
      },
      include: {
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
        tc: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // AuditLog
    await db.auditLog.create({
      data: {
        userId: tcUserId,
        action: 'AGENT_FEEDBACK_CREATED',
        entity: 'AgentFeedback',
        entityId: feedback.id,
        details: JSON.stringify({
          agentId,
          rating,
          hasComment: !!comment,
        }),
      },
    })

    return NextResponse.json(feedback, { status: 201 })
  } catch (error) {
    console.error('[TC Agent Feedback POST] Error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
