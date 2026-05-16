import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateSession, refreshSession, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS, deleteSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value

    if (!sessionToken) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const result = await validateSession(sessionToken)

    if (!result.valid || !result.userId) {
      // Clear the invalid session cookie
      const response = NextResponse.json({ error: 'Session expirée' }, { status: 401 })
      response.cookies.set(SESSION_COOKIE_NAME, '', { maxAge: 0, path: '/' })
      return response
    }

    const user = await db.user.findUnique({
      where: { id: result.userId },
      select: {
        id: true, phone: true, email: true, firstName: true, lastName: true,
        role: true, avatarUrl: true, isActive: true, isEmailVerified: true,
        gender: true, city: true, address: true, birthDate: true, nni: true,
        neofaceVerified: true, neofaceVerifiedAt: true, oneciVerified: true, oneciVerifiedAt: true,
      },
    })

    if (!user || !user.isActive) {
      await deleteSession(sessionToken).catch(() => {})
      const response = NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 401 })
      response.cookies.set(SESSION_COOKIE_NAME, '', { maxAge: 0, path: '/' })
      return response
    }

    const response = NextResponse.json({ user })

    // Sliding session: refresh if close to expiry
    if (result.shouldRefresh) {
      const refreshed = await refreshSession(sessionToken)
      if (refreshed) {
        response.cookies.set(SESSION_COOKIE_NAME, refreshed.newToken, {
          ...SESSION_COOKIE_OPTIONS,
          maxAge: Math.floor((refreshed.expiresAt.getTime() - Date.now()) / 1000),
        })
      } else {
        // Refresh failed, but session is still valid — just keep the existing cookie
      }
    }

    return response
  } catch (error) {
    console.error('Me error:', error)
    // On server error, return 500 NOT 401 — this prevents auto-logout
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
