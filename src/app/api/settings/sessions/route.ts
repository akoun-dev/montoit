import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest, deleteSession, SESSION_COOKIE_NAME } from '@/lib/session'

/**
 * GET /api/settings/sessions — List all active sessions for the current user
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const currentToken = req.cookies.get(SESSION_COOKIE_NAME)?.value

    // Get all active (non-expired) sessions for the user
    const sessions = await db.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        token: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Map sessions, marking the current one
    const mapped = sessions.map((s) => ({
      id: s.id,
      isCurrent: s.token === currentToken,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    }))

    return NextResponse.json({ sessions: mapped })
  } catch (error) {
    console.error('Sessions GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * DELETE /api/settings/sessions — Revoke all other sessions (keep current)
 * Body: { sessionIds?: string[] } — if provided, only revoke those. If not, revoke all except current.
 */
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const currentToken = req.cookies.get(SESSION_COOKIE_NAME)?.value
    const body = await req.json().catch(() => ({}))
    const { sessionIds } = body as { sessionIds?: string[] }

    if (sessionIds && sessionIds.length > 0) {
      // Delete specific sessions (but never the current one)
      for (const sid of sessionIds) {
        const session = await db.session.findUnique({ where: { id: sid } })
        if (session && session.userId === userId && session.token !== currentToken) {
          await deleteSession(session.token)
        }
      }
    } else {
      // Delete all sessions except current
      await db.session.deleteMany({
        where: {
          userId,
          token: { not: currentToken || '___none___' },
        },
      })
    }

    // Log the action
    await db.auditLog.create({
      data: {
        action: 'REVOKE_SESSIONS',
        entity: 'Session',
        userId,
      },
    })

    return NextResponse.json({ message: 'Sessions révoquées avec succès' })
  } catch (error) {
    console.error('Sessions DELETE error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
