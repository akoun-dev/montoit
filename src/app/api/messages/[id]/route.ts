import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/session'

// PATCH /api/messages/[id] — Mark a message as read
// Or mark all messages in a conversation as read with body: { markAllRead: true, conversationId: "xxx" }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { markAllRead, conversationId } = body as {
      markAllRead?: boolean
      conversationId?: string
    }

    // Mark all messages in a conversation as read
    if (markAllRead && conversationId) {
      const conversation = await db.conversation.findUnique({
        where: { id: conversationId },
      })

      if (!conversation) {
        return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
      }

      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }

      const result = await db.message.updateMany({
        where: {
          conversationId,
          isRead: false,
          senderId: { not: userId },
        },
        data: { isRead: true },
      })

      return NextResponse.json({
        message: 'Messages marqués comme lus',
        updatedCount: result.count,
      })
    }

    // Mark a single message as read
    const message = await db.message.findUnique({
      where: { id },
      include: { conversation: true },
    })

    if (!message) {
      return NextResponse.json({ error: 'Message introuvable' }, { status: 404 })
    }

    if (message.conversation.participant1Id !== userId && message.conversation.participant2Id !== userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    if (message.senderId === userId) {
      return NextResponse.json({ error: 'Vous ne pouvez pas marquer votre propre message' }, { status: 400 })
    }

    const updatedMessage = await db.message.update({
      where: { id },
      data: { isRead: true },
    })

    return NextResponse.json({ message: updatedMessage })
  } catch (error) {
    console.error('Messages PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
