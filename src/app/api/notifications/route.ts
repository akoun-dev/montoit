import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/session'

// GET /api/notifications — List notifications for current user with pagination & filters
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } })
    if (!user || user.role !== 'LOCATAIRE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

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

// PUT /api/notifications — Mark notifications as read
export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } })
    if (!user || user.role !== 'LOCATAIRE') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

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
