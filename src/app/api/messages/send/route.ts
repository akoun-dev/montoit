import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/session'
import { notify } from '@/lib/notify'

// POST /api/messages/send — Send a message to a propriétaire or agence
// Body: { recipientId: string, content: string, propertyId?: string }
// Creates a conversation if one doesn't exist, or adds to existing
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json()
    const { recipientId, content, propertyId } = body as {
      recipientId?: string
      content?: string
      propertyId?: string
    }

    if (!recipientId) {
      return NextResponse.json({ error: 'Destinataire requis' }, { status: 400 })
    }

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Le contenu du message est requis' }, { status: 400 })
    }

    if (recipientId === userId) {
      return NextResponse.json({ error: 'Vous ne pouvez pas vous envoyer un message' }, { status: 400 })
    }

    // Verify recipient exists
    const recipient = await db.user.findUnique({
      where: { id: recipientId },
      select: { id: true, firstName: true, lastName: true, role: true },
    })
    if (!recipient) {
      return NextResponse.json({ error: 'Destinataire introuvable' }, { status: 404 })
    }

    // Find existing conversation between these two users (with optional propertyId)
    const existingConversation = await db.conversation.findFirst({
      where: {
        OR: [
          { participant1Id: userId, participant2Id: recipientId, propertyId: propertyId || null },
          { participant1Id: recipientId, participant2Id: userId, propertyId: propertyId || null },
        ],
      },
    })

    let convId: string

    if (existingConversation) {
      convId = existingConversation.id
    } else {
      // Create new conversation
      const newConversation = await db.conversation.create({
        data: {
          participant1Id: userId,
          participant2Id: recipientId,
          propertyId: propertyId || null,
        },
      })
      convId = newConversation.id
    }

    // Create the message
    const message = await db.message.create({
      data: {
        content: content.trim(),
        conversationId: convId,
        senderId: userId,
        isRead: false,
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    })

    // Update conversation's lastMessageAt
    await db.conversation.update({
      where: { id: convId },
      data: { lastMessageAt: new Date() },
    })

    // Send notification to recipient
    const sender = await db.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    })

    if (sender) {
      await notify({
        userId: recipientId,
        type: 'MESSAGE',
        title: 'Nouveau message',
        message: `${sender.firstName} ${sender.lastName} vous a envoyé un message`,
        actionUrl: 'messages',
        entityId: convId,
      })
    }

    // Return the message with conversation data
    const conversation = await db.conversation.findUnique({
      where: { id: convId },
      include: {
        participant1: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        participant2: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        property: { select: { id: true, title: true, images: { orderBy: { order: 'asc' }, take: 1 } } },
      },
    })

    return NextResponse.json({
      message,
      conversation,
    })
  } catch (error) {
    console.error('Messages send error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
