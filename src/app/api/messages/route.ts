import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/session'

// GET /api/messages — List conversations for current user
// Query params:
//   conversationId=xxx — get all messages for a specific conversation
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get('conversationId')

    // If conversationId is provided, return all messages for that conversation
    if (conversationId) {
      const conversation = await db.conversation.findUnique({
        where: { id: conversationId },
        include: {
          participant1: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          participant2: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          property: { select: { id: true, title: true, images: { orderBy: { order: 'asc' }, take: 1 } } },
          messages: {
            orderBy: { createdAt: 'asc' },
            include: {
              sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            },
          },
        },
      })

      if (!conversation) {
        return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
      }

      // Verify user is a participant
      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }

      // Mark all unread messages from the other participant as read
      await db.message.updateMany({
        where: {
          conversationId,
          isRead: false,
          senderId: { not: userId },
        },
        data: { isRead: true },
      })

      // Re-fetch messages after marking as read (to reflect updated isRead)
      const updatedMessages = await db.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      })

      return NextResponse.json({
        conversation: {
          ...conversation,
          messages: updatedMessages,
        },
      })
    }

    // Otherwise, list all conversations for the current user
    const conversations = await db.conversation.findMany({
      where: {
        OR: [{ participant1Id: userId }, { participant2Id: userId }],
      },
      include: {
        participant1: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        participant2: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        property: { select: { id: true, title: true, images: { orderBy: { order: 'asc' }, take: 1 } } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    })

    // Get unread count per conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await db.message.count({
          where: {
            conversationId: conv.id,
            isRead: false,
            senderId: { not: userId },
          },
        })
        return {
          ...conv,
          unreadCount,
        }
      })
    )

    // Get total unread count
    const totalUnread = await db.message.count({
      where: {
        isRead: false,
        senderId: { not: userId },
        conversation: {
          OR: [{ participant1Id: userId }, { participant2Id: userId }],
        },
      },
    })

    return NextResponse.json({
      conversations: conversationsWithUnread,
      totalUnread,
    })
  } catch (error) {
    console.error('Messages GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/messages — Send a message
// Body: { conversationId?: string, recipientId?: string, content: string, propertyId?: string }
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json()
    const { conversationId, recipientId, content, propertyId } = body as {
      conversationId?: string
      recipientId?: string
      content?: string
      propertyId?: string
    }

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Le contenu du message est requis' }, { status: 400 })
    }

    let convId = conversationId

    if (convId) {
      // Add message to existing conversation
      const conversation = await db.conversation.findUnique({
        where: { id: convId },
      })

      if (!conversation) {
        return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
      }

      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }
    } else if (recipientId) {
      // Create new conversation or find existing one
      if (recipientId === userId) {
        return NextResponse.json({ error: 'Vous ne pouvez pas vous envoyer un message' }, { status: 400 })
      }

      // Check if recipient exists
      const recipient = await db.user.findUnique({ where: { id: recipientId } })
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
    } else {
      return NextResponse.json(
        { error: 'Fournissez conversationId ou recipientId' },
        { status: 400 }
      )
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
    console.error('Messages POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
