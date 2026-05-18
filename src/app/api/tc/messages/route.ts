import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify } from '@/lib/notify'

async function authorizeTC(request: NextRequest) {
  const { userId, applyCookies } = await resolveRequestUser(request)
  if (!userId) return { error: applyCookies(NextResponse.json({ error: 'Non authentifié' }, { status: 401 })) }

  const supabase = getSupabaseAdminClient()
  const { data: profile } = await ((supabase as any)
    .from('users')
    .select('role, active_role')
    .eq('id', userId)
    .single())

  const effectiveRole = profile?.active_role || profile?.role
  if (effectiveRole !== 'TIERS_CONFIANCE')
    return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }

  return { userId, applyCookies, supabase }
}

export async function GET(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId, applyCookies, supabase } = auth

  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')

    if (conversationId) {
      const { data: conversation } = await ((supabase as any)
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single())

      if (!conversation) {
        return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
      }

      if (conversation.participant1_id !== userId && conversation.participant2_id !== userId) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }

      const participantIds = [conversation.participant1_id, conversation.participant2_id].filter(Boolean)

      const [{ data: participantsData }, { data: propertyData }, { data: messagesData }] = await Promise.all([
        (supabase.from('users') as any).select('id, first_name, last_name, avatar_url, role, active_role').in('id', participantIds) as any,
        conversation.property_id
          ? (supabase.from('properties') as any).select('id, title, address, city').eq('id', conversation.property_id).single() as any
          : Promise.resolve({ data: null, error: null }),
        (supabase.from('messages') as any).select('*, sender:users!sender_id(id, first_name, last_name, avatar_url)').eq('conversation_id', conversationId).order('created_at', { ascending: true }) as any,
      ])

      const participantMap = new Map<string, any>((participantsData ?? []).map((p: any) => [p.id, p]))

      let firstImage: any = null
      if (conversation.property_id) {
        const { data: images } = await supabase
          .from('property_images')
          .select('id, url')
          .eq('property_id', conversation.property_id)
          .order('order', { ascending: true })
          .limit(1) as any
        if (images && images.length > 0) firstImage = images[0]
      }

      await (supabase as any)
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('is_read', false)
        .neq('sender_id', userId)

      const { data: updatedMessagesData } = await ((supabase as any)
        .from('messages')
        .select('*, sender:users!sender_id(id, first_name, last_name, avatar_url)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true }))

      const messages = (updatedMessagesData ?? []).map((m: any) => ({
        id: m.id,
        conversationId: m.conversation_id,
        content: m.content,
        senderId: m.sender_id,
        isRead: m.is_read,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
        sender: m.sender ? {
          id: m.sender.id,
          firstName: m.sender.first_name,
          lastName: m.sender.last_name,
          avatarUrl: m.sender.avatar_url,
        } : null,
      }))

      const respData = {
        conversation: {
          id: conversation.id,
          participant1Id: conversation.participant1_id,
          participant2Id: conversation.participant2_id,
          propertyId: conversation.property_id,
          lastMessageAt: conversation.last_message_at,
          createdAt: conversation.created_at,
          participant1: participantMap.get(conversation.participant1_id) ? {
            id: participantMap.get(conversation.participant1_id).id,
            firstName: participantMap.get(conversation.participant1_id).first_name,
            lastName: participantMap.get(conversation.participant1_id).last_name,
            avatarUrl: participantMap.get(conversation.participant1_id).avatar_url,
            role: participantMap.get(conversation.participant1_id).role,
            activeRole: participantMap.get(conversation.participant1_id).active_role,
          } : null,
          participant2: participantMap.get(conversation.participant2_id) ? {
            id: participantMap.get(conversation.participant2_id).id,
            firstName: participantMap.get(conversation.participant2_id).first_name,
            lastName: participantMap.get(conversation.participant2_id).last_name,
            avatarUrl: participantMap.get(conversation.participant2_id).avatar_url,
            role: participantMap.get(conversation.participant2_id).role,
            activeRole: participantMap.get(conversation.participant2_id).active_role,
          } : null,
          property: propertyData ? {
            id: propertyData.id,
            title: propertyData.title,
            address: propertyData.address,
            city: propertyData.city,
            images: firstImage ? [{ id: firstImage.id, url: firstImage.url }] : [],
          } : null,
          messages,
        },
      }

      const resp = NextResponse.json(respData)
      return applyCookies(resp)
    }

    const { data: conversationsData } = await ((supabase as any)
      .from('conversations')
      .select('*')
      .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false }))

    const convs = (conversationsData ?? []) as any[]

    if (convs.length === 0) {
      const resp = NextResponse.json({ conversations: [], totalUnread: 0 })
      return applyCookies(resp)
    }

    const allParticipantIds = [...new Set(convs.flatMap((c: any) => [c.participant1_id, c.participant2_id]).filter(Boolean))]
    const convIds = convs.map((c: any) => c.id)
    const propIds = [...new Set(convs.map((c: any) => c.property_id).filter(Boolean))]

    const [{ data: participantsData }, { data: propertiesData }, { data: lastMessagesData }] = await Promise.all([
      (supabase.from('users') as any).select('id, first_name, last_name, avatar_url, role, active_role').in('id', allParticipantIds) as any,
      (supabase.from('properties') as any).select('id, title, address, city').in('id', propIds) as any,
      (supabase.from('messages') as any).select('*, sender:users!sender_id(id, first_name, last_name)').in('conversation_id', convIds).order('created_at', { ascending: false }).limit(convs.length) as any,
    ])

    const participantMap = new Map<string, any>((participantsData ?? []).map((p: any) => [p.id, p]))
    const propertyMap = new Map<string, any>((propertiesData ?? []).map((p: any) => [p.id, p]))

    const lastMsgByConv = new Map<string, any>()
    for (const msg of (lastMessagesData ?? []) as any[]) {
      if (!lastMsgByConv.has(msg.conversation_id)) lastMsgByConv.set(msg.conversation_id, msg)
    }

    const { data: unreadCounts } = await ((supabase as any)
      .from('messages')
      .select('conversation_id')
      .eq('is_read', false)
      .neq('sender_id', userId)
      .in('conversation_id', convIds) as any)

      const unreadByConv = new Map<string, number>()
    for (const msg of (unreadCounts ?? []) as any[]) {
      unreadByConv.set(msg.conversation_id, (unreadByConv.get(msg.conversation_id) ?? 0) + 1)
    }

    const { data: totalUnreadData } = await ((supabase as any)
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false)
      .neq('sender_id', userId) as any)

      const totalUnread = totalUnreadData ?? 0

    const { data: firstImages } = propIds.length > 0
      ? await (supabase.from('property_images') as any).select('id, url, property_id').in('property_id', propIds).order('order', { ascending: true }) as any
      : { data: [] as any[] }

    const imageByProperty = new Map<string, any>()
    for (const img of (firstImages ?? []) as any[]) {
      if (!imageByProperty.has(img.property_id)) imageByProperty.set(img.property_id, img)
    }

    const conversationsWithUnread = convs.map((conv: any) => {
      const lastMsg = lastMsgByConv.get(conv.id)
      return {
        id: conv.id,
        lastMessageAt: conv.last_message_at,
        createdAt: conv.created_at,
        propertyId: conv.property_id,
        participant1Id: conv.participant1_id,
        participant2Id: conv.participant2_id,
        participant1: participantMap.get(conv.participant1_id) ? {
          id: participantMap.get(conv.participant1_id).id,
          firstName: participantMap.get(conv.participant1_id).first_name,
          lastName: participantMap.get(conv.participant1_id).last_name,
          avatarUrl: participantMap.get(conv.participant1_id).avatar_url,
          role: participantMap.get(conv.participant1_id).role,
          activeRole: participantMap.get(conv.participant1_id).active_role,
        } : null,
        participant2: participantMap.get(conv.participant2_id) ? {
          id: participantMap.get(conv.participant2_id).id,
          firstName: participantMap.get(conv.participant2_id).first_name,
          lastName: participantMap.get(conv.participant2_id).last_name,
          avatarUrl: participantMap.get(conv.participant2_id).avatar_url,
          role: participantMap.get(conv.participant2_id).role,
          activeRole: participantMap.get(conv.participant2_id).active_role,
        } : null,
        property: propertyMap.get(conv.property_id) ? {
          id: propertyMap.get(conv.property_id).id,
          title: propertyMap.get(conv.property_id).title,
          address: propertyMap.get(conv.property_id).address,
          city: propertyMap.get(conv.property_id).city,
          images: imageByProperty.has(conv.property_id) ? [imageByProperty.get(conv.property_id)] : [],
        } : null,
        lastMessage: lastMsg ? {
          id: lastMsg.id,
          content: lastMsg.content,
          senderId: lastMsg.sender_id,
          createdAt: lastMsg.created_at,
          sender: lastMsg.sender ? {
            id: lastMsg.sender.id,
            firstName: lastMsg.sender.first_name,
            lastName: lastMsg.sender.last_name,
          } : null,
        } : null,
        messageCount: 0,
        unreadCount: unreadByConv.get(conv.id) ?? 0,
      }
    })

    const resp = NextResponse.json({ conversations: conversationsWithUnread, totalUnread })
    return applyCookies(resp)
  } catch (error) {
    console.error('[TC Messages GET] Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId, applyCookies, supabase } = auth

  try {
    const body = await request.json()
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
      const { data: conversation } = await ((supabase as any)
        .from('conversations')
        .select('*')
        .eq('id', convId)
        .single())

      if (!conversation) {
        return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
      }
      if (conversation.participant1_id !== userId && conversation.participant2_id !== userId) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }
    } else if (recipientId) {
      if (recipientId === userId) {
        return NextResponse.json({ error: 'Vous ne pouvez pas vous envoyer un message' }, { status: 400 })
      }

      const { data: recipient } = await ((supabase as any)
        .from('users')
        .select('id')
        .eq('id', recipientId)
        .single())
      if (!recipient) {
        return NextResponse.json({ error: 'Destinataire introuvable' }, { status: 404 })
      }

      const { data: existingConv } = await ((supabase as any)
        .from('conversations')
        .select('id')
        .or(`and(participant1_id.eq.${userId},participant2_id.eq.${recipientId}),and(participant1_id.eq.${recipientId},participant2_id.eq.${userId})`)
        .maybeSingle())

      if (existingConv) {
        convId = existingConv.id
      } else {
        const { data: newConv } = await ((supabase as any)
          .from('conversations')
          .insert({
            participant1_id: userId,
            participant2_id: recipientId,
            property_id: propertyId || null,
          })
          .select()
          .single())
        convId = newConv.id
      }
    } else {
      return NextResponse.json(
        { error: 'Fournissez conversationId ou recipientId' },
        { status: 400 }
      )
    }

    const { data: message } = await ((supabase as any)
      .from('messages')
      .insert({
        content: content.trim(),
        conversation_id: convId,
        sender_id: userId,
        is_read: false,
      })
      .select('*, sender:users!sender_id(id, first_name, last_name, avatar_url)')
      .single())

    await (supabase as any)
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', convId)

    const { data: convForNotification } = await ((supabase as any)
      .from('conversations')
      .select('participant1_id, participant2_id')
      .eq('id', convId)
      .single())

    if (convForNotification) {
      const notifRecipientId = convForNotification.participant1_id === userId
        ? convForNotification.participant2_id
        : convForNotification.participant1_id

      const { data: sender } = await ((supabase as any)
        .from('users')
        .select('first_name, last_name')
        .eq('id', userId)
        .single())

      if (sender && notifRecipientId) {
        await notify({
          userId: notifRecipientId,
          type: 'MESSAGE',
          title: 'Nouveau message',
          message: `${sender.first_name} ${sender.last_name} vous a envoyé un message`,
          actionUrl: 'messaging',
          entityId: convId,
        })
      }
    }

    const { data: conversation } = await ((supabase as any)
      .from('conversations')
      .select('*')
      .eq('id', convId)
      .single())

    const participantIds = [conversation.participant1_id, conversation.participant2_id].filter(Boolean)
    const { data: participantsData } = await supabase
      .from('users')
      .select('id, first_name, last_name, avatar_url, role, active_role')
      .in('id', participantIds) as any

    const participantMap = new Map<string, any>((participantsData ?? []).map((p: any) => [p.id, p]))

    let convProperty: any = null
    if (conversation.property_id) {
      const { data: cp } = await ((supabase as any)
        .from('properties')
        .select('id, title, address, city')
        .eq('id', conversation.property_id)
        .single())
      convProperty = cp
    }

    const resp = NextResponse.json({
      message: {
        id: message.id,
        conversationId: message.conversation_id,
        content: message.content,
        senderId: message.sender_id,
        isRead: message.is_read,
        createdAt: message.created_at,
        updatedAt: message.updated_at,
        sender: message.sender ? {
          id: message.sender.id,
          firstName: message.sender.first_name,
          lastName: message.sender.last_name,
          avatarUrl: message.sender.avatar_url,
        } : null,
      },
      conversation: {
        id: conversation.id,
        participant1Id: conversation.participant1_id,
        participant2Id: conversation.participant2_id,
        propertyId: conversation.property_id,
        lastMessageAt: conversation.last_message_at,
        createdAt: conversation.created_at,
        participant1: participantMap.get(conversation.participant1_id) ? {
          id: participantMap.get(conversation.participant1_id).id,
          firstName: participantMap.get(conversation.participant1_id).first_name,
          lastName: participantMap.get(conversation.participant1_id).last_name,
          avatarUrl: participantMap.get(conversation.participant1_id).avatar_url,
          role: participantMap.get(conversation.participant1_id).role,
          activeRole: participantMap.get(conversation.participant1_id).active_role,
        } : null,
        participant2: participantMap.get(conversation.participant2_id) ? {
          id: participantMap.get(conversation.participant2_id).id,
          firstName: participantMap.get(conversation.participant2_id).first_name,
          lastName: participantMap.get(conversation.participant2_id).last_name,
          avatarUrl: participantMap.get(conversation.participant2_id).avatar_url,
          role: participantMap.get(conversation.participant2_id).role,
          activeRole: participantMap.get(conversation.participant2_id).active_role,
        } : null,
        property: convProperty ? {
          id: convProperty.id,
          title: convProperty.title,
          address: convProperty.address,
          city: convProperty.city,
        } : null,
      },
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('[TC Messages POST] Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await authorizeTC(request)
  if ('error' in auth) return auth.error
  const { userId, applyCookies, supabase } = auth

  try {
    const body = await request.json()
    const { conversationId } = body as { conversationId?: string }

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId est requis' }, { status: 400 })
    }

    const { data: conversation } = await ((supabase as any)
      .from('conversations')
      .select('participant1_id, participant2_id')
      .eq('id', conversationId)
      .single())

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
    }
    if (conversation.participant1_id !== userId && conversation.participant2_id !== userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { data: result } = await ((supabase as any)
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('is_read', false)
      .neq('sender_id', userId)
      .select('id', { count: 'exact' }))

    const resp = NextResponse.json({ markedAsRead: (result ?? []).length })
    return applyCookies(resp)
  } catch (error) {
    console.error('[TC Messages PATCH] Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
