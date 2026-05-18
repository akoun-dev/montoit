import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'

// POST /api/reviews/[id]/reply — Reply to a review
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
    const { reply } = body as { reply?: string }

    if (!reply || reply.trim().length === 0) {
      return NextResponse.json(
        { error: 'Veuillez fournir une réponse' },
        { status: 400 }
      )
    }

    // Find the rating
    const rating = await db.rating.findUnique({
      where: { id },
      select: {
        id: true,
        toUserId: true,
        fromUserId: true,
        score: true,
        lease: {
          select: {
            property: { select: { title: true } },
          },
        },
      },
    })

    if (!rating) {
      return NextResponse.json(
        { error: 'Avis introuvable' },
        { status: 404 }
      )
    }

    // Only the rated user (toUserId) can reply
    if (rating.toUserId !== userId) {
      return NextResponse.json(
        { error: 'Seul l\'utilisateur évalué peut répondre à cet avis' },
        { status: 403 })
    }

    // Check if already replied
    const existingRating = await db.rating.findUnique({
      where: { id },
      select: { reply: true },
    })
    if (existingRating?.reply) {
      return NextResponse.json(
        { error: 'Vous avez déjà répondu à cet avis' },
        { status: 400 }
      )
    }

    // Save the reply
    const updated = await db.rating.update({
      where: { id },
      data: {
        reply: reply.trim(),
        repliedAt: new Date(),
      },
      include: {
        lease: {
          select: {
            id: true,
            property: { select: { id: true, title: true, city: true } },
          },
        },
        fromUser: { select: { id: true, firstName: true, lastName: true } },
        toUser: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    // Notify the reviewer
    await db.notification.create({
      data: {
        userId: rating.fromUserId,
        type: 'DOSSIER_UPDATE',
        title: 'Réponse à votre avis',
        message: `${updated.toUser.firstName} ${updated.toUser.lastName} a répondu à votre avis sur "${rating.lease?.property?.title || 'bien'}".`,
        entityId: rating.id,
      },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Review reply error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
