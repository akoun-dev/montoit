import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { markAllRead, conversationId } = body as {
      markAllRead?: boolean
      conversationId?: string
    }

    const admin = getSupabaseAdminClient()

    if (markAllRead && conversationId) {
      const { data: conv } = await admin
        .from('conversations')
        .select('id, participant1_id, participant2_id')
        .eq('id', conversationId)
        .single()

      if (!conv) {
        return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
      }

      if (conv.participant1_id !== userId && conv.participant2_id !== userId) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }

      const { error } = await admin
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('is_read', false)
        .neq('sender_id', userId)

      if (error) throw error

      const response = NextResponse.json({ message: 'Messages marqués comme lus' })
      return applyCookies(response)
    }

    const { data: message } = await admin
      .from('messages')
      .select('id, conversation_id, sender_id, is_read')
      .eq('id', id)
      .single()

    if (!message) {
      return NextResponse.json({ error: 'Message introuvable' }, { status: 404 })
    }

    const { data: conv } = await admin
      .from('conversations')
      .select('participant1_id, participant2_id')
      .eq('id', message.conversation_id)
      .single()

    if (!conv || (conv.participant1_id !== userId && conv.participant2_id !== userId)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    if (message.sender_id === userId) {
      return NextResponse.json({ error: 'Vous ne pouvez pas marquer votre propre message' }, { status: 400 })
    }

    const { data: updated } = await admin
      .from('messages')
      .update({ is_read: true })
      .eq('id', id)
      .select()
      .single()

    const response = NextResponse.json({
      message: {
        id: updated?.id,
        content: updated?.content,
        isRead: updated?.is_read,
        createdAt: updated?.created_at,
        conversationId: updated?.conversation_id,
        senderId: updated?.sender_id,
      },
    })
    return applyCookies(response)
  } catch (error) {
    console.error('Messages PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
