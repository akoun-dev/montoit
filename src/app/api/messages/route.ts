import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { notify } from '@/lib/notify'

function generateId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get('conversationId')
    const admin = getSupabaseAdminClient()

    if (conversationId) {
      const { data: conv } = await admin
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single()

      if (!conv) {
        return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
      }

      if (conv.participant1_id !== userId && conv.participant2_id !== userId) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }

      await admin
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('is_read', false)
        .neq('sender_id', userId)

      const { data: msgRows } = await admin
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      const enriched = await enrichMessages(msgRows ?? [], admin)

      const p1 = await getUserSummary(conv.participant1_id, admin)
      const p2 = await getUserSummary(conv.participant2_id, admin)
      const prop = conv.property_id ? await getPropertySummary(conv.property_id, admin) : null

      const response = NextResponse.json({
        conversation: {
          id: conv.id,
          lastMessageAt: conv.last_message_at,
          createdAt: conv.created_at,
          propertyId: conv.property_id,
          participant1Id: conv.participant1_id,
          participant2Id: conv.participant2_id,
          participant1: p1,
          participant2: p2,
          property: prop,
          messages: enriched,
        },
      })
      return applyCookies(response)
    }

    const { data: convRows } = await admin
      .from('conversations')
      .select('*')
      .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    const enrichedConvs = await Promise.all(
      (convRows ?? []).map(async (conv) => {
        const p1 = await getUserSummary(conv.participant1_id, admin)
        const p2 = await getUserSummary(conv.participant2_id, admin)
        const prop = conv.property_id ? await getPropertySummary(conv.property_id, admin) : null

        const { data: lastMsg } = await admin
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)

        const { count: unreadCount } = await admin
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('is_read', false)
          .neq('sender_id', userId)

        return {
          id: conv.id,
          lastMessageAt: conv.last_message_at,
          createdAt: conv.created_at,
          propertyId: conv.property_id,
          participant1Id: conv.participant1_id,
          participant2Id: conv.participant2_id,
          participant1: p1,
          participant2: p2,
          property: prop,
          messages: (lastMsg ?? []).map((m) => ({
            id: m.id,
            content: m.content,
            isRead: m.is_read,
            createdAt: m.created_at,
            conversationId: m.conversation_id,
            senderId: m.sender_id,
          })),
          unreadCount: unreadCount ?? 0,
        }
      })
    )

    const { count: totalUnread } = await admin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
      .neq('sender_id', userId)

    const response = NextResponse.json({ conversations: enrichedConvs, totalUnread: totalUnread ?? 0 })
    return applyCookies(response)
  } catch (error) {
    console.error('Messages GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
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

    const admin = getSupabaseAdminClient()
    let convId = conversationId

    if (convId) {
      const { data: conv } = await admin
        .from('conversations')
        .select('id, participant1_id, participant2_id')
        .eq('id', convId)
        .single()

      if (!conv) {
        return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
      }

      if (conv.participant1_id !== userId && conv.participant2_id !== userId) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }
    } else if (recipientId) {
      if (recipientId === userId) {
        return NextResponse.json({ error: 'Vous ne pouvez pas vous envoyer un message' }, { status: 400 })
      }

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

      if (existingConvs && existingConvs.length > 0) {
        convId = existingConvs[0].id
      } else {
        const { data: newConv, error: convError } = await admin
          .from('conversations')
          .insert({
            id: generateId(),
            participant1_id: userId,
            participant2_id: recipientId,
            property_id: propertyId || null,
          })
          .select()
          .single()

        if (convError) throw convError
        convId = newConv.id
      }
    } else {
      const resp = NextResponse.json(
        { error: 'Fournissez conversationId ou recipientId' },
        { status: 400 }
      )
      return applyCookies(resp)
    }

    const { data: message, error: msgError } = await admin
      .from('messages')
      .insert({
        id: generateId(),
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

    const { data: convData } = await admin
      .from('conversations')
      .select('participant1_id, participant2_id')
      .eq('id', convId)
      .single()

    if (convData) {
      const notifRecipientId = convData.participant1_id === userId
        ? convData.participant2_id
        : convData.participant1_id

      if (notifRecipientId) {
        const sender = await getUserSummary(userId, admin)
        if (sender) {
          await notify({
            userId: notifRecipientId,
            type: 'MESSAGE',
            title: 'Nouveau message',
            message: `${sender.firstName} ${sender.lastName} vous a envoyé un message`,
            actionUrl: 'messages',
            entityId: convId,
          })
        }
      }
    }

    const p1 = await getUserSummary(userId, admin)
    const sender = p1 ? { id: p1.id, firstName: p1.firstName, lastName: p1.lastName, avatarUrl: p1.avatarUrl } : null
    const enrichedMsg = {
      id: message.id,
      content: message.content,
      isRead: message.is_read,
      createdAt: message.created_at,
      conversationId: message.conversation_id,
      senderId: message.sender_id,
      sender,
    }

    const p1Summary = convData ? await getUserSummary(convData.participant1_id, admin) : null
    const p2Summary = convData ? await getUserSummary(convData.participant2_id, admin) : null
    const propSummary = propertyId ? await getPropertySummary(propertyId, admin) : null

    const response = NextResponse.json({
      message: enrichedMsg,
      conversation: {
        id: convId,
        lastMessageAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        propertyId: propertyId || null,
        participant1Id: convData?.participant1_id ?? null,
        participant2Id: convData?.participant2_id ?? null,
        participant1: p1Summary,
        participant2: p2Summary,
        property: propSummary,
      },
    })
    return applyCookies(response)
  } catch (error) {
    console.error('Messages POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

async function getUserSummary(userId: string, admin: ReturnType<typeof getSupabaseAdminClient>) {
  if (!userId) return null
  const { data } = await admin
    .from('users')
    .select('id, first_name, last_name, avatar_url')
    .eq('id', userId)
    .maybeSingle()
  if (!data) return null
  return { id: data.id, firstName: data.first_name, lastName: data.last_name, avatarUrl: data.avatar_url }
}

async function getPropertySummary(propertyId: string, admin: ReturnType<typeof getSupabaseAdminClient>) {
  const { data } = await admin
    .from('properties')
    .select('id, title')
    .eq('id', propertyId)
    .single()
  if (!data) return null
  const { data: images } = await admin
    .from('property_images')
    .select('url')
    .eq('property_id', propertyId)
    .order('order', { ascending: true })
    .limit(1)
  return { id: data.id, title: data.title, images: images ?? [] }
}

async function enrichMessages(rows: Array<Record<string, unknown>>, admin: ReturnType<typeof getSupabaseAdminClient>) {
  const senderIds = [...new Set(rows.map((r) => r.sender_id as string).filter(Boolean))]
  const senderMap = new Map<string, { id: string; firstName: string; lastName: string; avatarUrl: string | null }>()
  if (senderIds.length > 0) {
    const { data: users } = await admin
      .from('users')
      .select('id, first_name, last_name, avatar_url')
      .in('id', senderIds)
    for (const u of users ?? []) {
      senderMap.set(u.id, { id: u.id, firstName: u.first_name, lastName: u.last_name, avatarUrl: u.avatar_url })
    }
  }
  return rows.map((r) => ({
    id: r.id,
    content: r.content,
    isRead: r.is_read,
    createdAt: r.created_at,
    conversationId: r.conversation_id,
    senderId: r.sender_id,
    sender: senderMap.get(r.sender_id as string) ?? null,
  }))
}
