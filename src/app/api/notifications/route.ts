import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { notify } from '@/lib/notify'

export async function GET(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const type = searchParams.get('type')
    const isReadParam = searchParams.get('isRead')

    const admin = getSupabaseAdminClient()

    let query = admin
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (type) {
      query = query.eq('type', type)
    }
    if (isReadParam !== null && isReadParam !== undefined && isReadParam !== '') {
      query = query.eq('is_read', isReadParam === 'true')
    }

    const { data: notifications, count, error } = await query

    if (error) {
      throw error
    }

    const { count: unreadCount, error: unreadError } = await admin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (unreadError) {
      throw unreadError
    }

    const mapped = (notifications ?? []).map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      isRead: n.is_read,
      actionUrl: n.action_url,
      entityId: n.entity_id,
      createdAt: n.created_at,
      userId: n.user_id,
    }))

    const response = NextResponse.json({
      data: mapped,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
      unreadCount: unreadCount ?? 0,
    })
    return applyCookies(response)
  } catch (error) {
    console.error('Notifications GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const admin = getSupabaseAdminClient()
    const { data: profile } = await admin
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .single()

    const effectiveRole = profile?.active_role || profile?.role

    const body = await req.json()
    const { userId: targetUserId, type, title, message, entityId, actionUrl } = body as {
      userId?: string
      type?: string
      title?: string
      message?: string
      entityId?: string
      actionUrl?: string
    }

    if (type === 'PAYMENT_ALERT') {
      if (effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE') {
        const resp = NextResponse.json({ error: 'Seuls les propriétaires peuvent envoyer des rappels de paiement' }, { status: 403 })
        return applyCookies(resp)
      }
      if (!targetUserId || !title || !message) {
        const resp = NextResponse.json({ error: 'userId, title et message sont requis' }, { status: 400 })
        return applyCookies(resp)
      }

      const notification = await notify({
        userId: targetUserId,
        type: 'PAYMENT_ALERT',
        title,
        message,
        entityId: entityId || undefined,
        actionUrl: actionUrl || undefined,
      })

      const response = NextResponse.json({ data: notification }, { status: 201 })
      return applyCookies(response)
    }

    const response = NextResponse.json({ error: 'Type de notification non supporté' }, { status: 400 })
    return applyCookies(response)
  } catch (error) {
    console.error('Notifications POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json()
    const { notificationIds, markAllRead } = body as {
      notificationIds?: string[]
      markAllRead?: boolean
    }

    const admin = getSupabaseAdminClient()

    if (markAllRead) {
      const { error } = await admin
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) throw error

      const response = NextResponse.json({ message: 'Toutes les notifications marquées comme lues' })
      return applyCookies(response)
    }

    if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      const { error } = await admin
        .from('notifications')
        .update({ is_read: true })
        .in('id', notificationIds)
        .eq('user_id', userId)

      if (error) throw error

      const response = NextResponse.json({ message: 'Notifications marquées comme lues' })
      return applyCookies(response)
    }

    const response = NextResponse.json(
      { error: 'Fournir notificationIds ou markAllRead' },
      { status: 400 }
    )
    return applyCookies(response)
  } catch (error) {
    console.error('Notifications PUT error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
