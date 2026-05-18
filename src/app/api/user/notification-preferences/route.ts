import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/session'

const VALID_KEYS = ['messages', 'dossierUpdates', 'visitReminders', 'paymentAlerts', 'promotions'] as const

/**
 * GET /api/user/notification-preferences — Fetch notification preferences for current user
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    let prefs = await db.notificationPreference.findUnique({
      where: { userId },
    })

    // Auto-create default preferences if they don't exist
    if (!prefs) {
      prefs = await db.notificationPreference.create({
        data: { userId },
      })
    }

    return NextResponse.json({ preferences: prefs })
  } catch (error) {
    console.error('Notification preferences GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * PUT /api/user/notification-preferences — Update notification preferences
 * Body: { messages?: boolean, dossierUpdates?: boolean, visitReminders?: boolean, paymentAlerts?: boolean, promotions?: boolean }
 */
export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json()
    const updateData: Record<string, boolean> = {}

    for (const key of VALID_KEYS) {
      if (body[key] !== undefined) {
        if (typeof body[key] !== 'boolean') {
          return NextResponse.json({ error: `La valeur de ${key} doit être un booléen` }, { status: 400 })
        }
        updateData[key] = body[key]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Aucune préférence à mettre à jour' }, { status: 400 })
    }

    const prefs = await db.notificationPreference.upsert({
      where: { userId },
      update: updateData,
      create: { userId, ...updateData },
    })

    return NextResponse.json({ preferences: prefs })
  } catch (error) {
    console.error('Notification preferences PUT error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
