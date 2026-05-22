import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { notify } from '@/lib/notify'

export async function POST(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
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

    const admin = getSupabaseAdminClient()

    const { data: recipient } = await admin
      .from('users')
      .select('id')
      .eq('id', recipientId)
      .maybeSingle()

    if (!recipient) {
      return NextResponse.json({ error: 'Destinataire introuvable' }, { status: 404 })
    }

    const { data: existingConvs } = await admin
      .from('conversations')
      .select('id')
      .or(`and(participant1_id.eq.${userId},participant2_id.eq.${recipientId}),and(participant1_id.eq.${recipientId},participant2_id.eq.${userId})`)

    let convId: string
    if (existingConvs && existingConvs.length > 0) {
      convId = existingConvs[0].id
    } else {
      const { data: newConv, error: convError } = await admin
        .from('conversations')
        .insert({
          participant1_id: userId,
          participant2_id: recipientId,
          property_id: propertyId || null,
        })
        .select()
        .single()

      if (convError) throw convError
      convId = newConv.id
    }

    if (propertyId) {
      const { data: msgProperty } = await admin
        .from('properties')
        .select('id, rental_status, owner_id')
        .eq('id', propertyId)
        .maybeSingle()

      if (msgProperty && msgProperty.rental_status === 'loue' && msgProperty.owner_id !== userId) {
        return NextResponse.json({ error: 'Ce bien est déjà loué' }, { status: 400 })
      }
    }

    const { data: message, error: msgError } = await admin
      .from('messages')
      .insert({
        content: content.trim(),
        conversation_id: convId,
        sender_id: userId,
        is_read: false,
      })
      .select()
      .single()

    if (msgError) throw msgError

    await admin
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', convId)

    const senderData = await admin
      .from('users')
      .select('first_name, last_name')
      .eq('id', userId)
      .single()

    if (senderData.data) {
      await notify({
        userId: recipientId,
        type: 'MESSAGE',
        title: 'Nouveau message',
        message: `${senderData.data.first_name} ${senderData.data.last_name} vous a envoyé un message`,
        actionUrl: 'messages',
        entityId: convId,
      })
    }

    const sender = senderData.data
      ? { id: userId, firstName: senderData.data.first_name, lastName: senderData.data.last_name }
      : null

    const response = NextResponse.json({
      message: {
        id: message.id,
        content: message.content,
        isRead: message.is_read,
        createdAt: message.created_at,
        conversationId: message.conversation_id,
        senderId: message.sender_id,
        sender,
      },
      conversation: {
        id: convId,
        lastMessageAt: message.created_at,
      },
    })
    return applyCookies(response)
  } catch (error) {
    console.error('Messages send error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
