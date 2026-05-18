import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdAndRole } from '@/lib/session'
import { notify } from '@/lib/notify'

// GET /api/notifications — List notifications for current user with pagination & filters
export async function GET(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const type = searchParams.get('type') || undefined
    const isRead = searchParams.get('isRead')

    const where: Record<string, unknown> = { userId }
    if (type) {
      where.type = type
    }
    if (isRead !== null && isRead !== undefined && isRead !== '') {
      where.isRead = isRead === 'true'
    }

    const [notifications, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.notification.count({ where }),
      db.notification.count({ where: { userId, isRead: false } }),
    ])

    return NextResponse.json({
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    })
  } catch (error) {
    console.error('Notifications GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/notifications — Create a notification (e.g. payment reminder)
export async function POST(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    const body = await req.json()
    const { userId: targetUserId, type, title, message, entityId, actionUrl } = body as {
      userId?: string
      type?: string
      title?: string
      message?: string
      entityId?: string
      actionUrl?: string
    }

    // Only PROPRIETAIRE or AGENCE can send PAYMENT_ALERT notifications to tenants
    if (type === 'PAYMENT_ALERT') {
      if (effectiveRole !== 'PROPRIETAIRE' && effectiveRole !== 'AGENCE') {
        return NextResponse.json({ error: 'Seuls les propriétaires peuvent envoyer des rappels de paiement' }, { status: 403 })
      }
      if (!targetUserId || !title || !message) {
        return NextResponse.json({ error: 'userId, title et message sont requis' }, { status: 400 })
      }

      const notification = await notify({
        userId: targetUserId,
        type: 'PAYMENT_ALERT',
        title,
        message,
        entityId: entityId || undefined,
        actionUrl: actionUrl || undefined,
      })

      return NextResponse.json({ data: notification }, { status: 201 })
    }

    // Other notification types are not allowed via POST
    return NextResponse.json({ error: 'Type de notification non supporté' }, { status: 400 })
  } catch (error) {
    console.error('Notifications POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT /api/notifications — Mark notifications as read
export async function PUT(req: NextRequest) {
  try {
    const authResult = await getUserIdAndRole(req)
    if (!authResult) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { userId, effectiveRole } = authResult

    const body = await req.json()
    const { notificationIds, markAllRead } = body as {
      notificationIds?: string[]
      markAllRead?: boolean
    }

    if (markAllRead) {
      const result = await db.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      })
      return NextResponse.json({
        message: 'Toutes les notifications marquées comme lues',
        updatedCount: result.count,
      })
    }

    if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      // Only mark notifications that belong to this user
      const result = await db.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId, // Ensure user can only mark their own notifications
        },
        data: { isRead: true },
      })
      return NextResponse.json({
        message: 'Notifications marquées comme lues',
        updatedCount: result.count,
      })
    }

    return NextResponse.json(
      { error: 'Fournir notificationIds ou markAllRead' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Notifications PUT error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
