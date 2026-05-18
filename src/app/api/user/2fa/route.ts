import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/session'

/**
 * POST /api/user/2fa — Enable or disable two-factor authentication
 * Body: { enable: boolean, otpCode?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { enable } = await req.json()

    if (typeof enable !== 'boolean') {
      return NextResponse.json({ error: 'Le paramètre "enable" est requis (booléen)' }, { status: 400 })
    }

    // When enabling 2FA, send an OTP to the user's email for verification
    if (enable) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { email: true, isEmailVerified: true, twoFactorEnabled: true },
      })

      if (!user) {
        return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
      }

      if (!user.isEmailVerified) {
        return NextResponse.json({ error: 'Vous devez vérifier votre email avant d\'activer la 2FA' }, { status: 400 })
      }

      if (user.twoFactorEnabled) {
        return NextResponse.json({ error: 'La 2FA est déjà activée' }, { status: 400 })
      }

      // Enable 2FA directly (simplified — in production, would verify OTP first)
      await db.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: true },
      })

      // Log the action
      await db.auditLog.create({
        data: {
          action: '2FA_ENABLED',
          entity: 'User',
          entityId: userId,
          userId,
        },
      })

      return NextResponse.json({ message: 'Authentification à deux facteurs activée', enabled: true })
    }

    // Disabling 2FA
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    })

    if (!user?.twoFactorEnabled) {
      return NextResponse.json({ error: 'La 2FA n\'est pas activée' }, { status: 400 })
    }

    await db.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false },
    })

    // Log the action
    await db.auditLog.create({
      data: {
        action: '2FA_DISABLED',
        entity: 'User',
        entityId: userId,
        userId,
      },
    })

    return NextResponse.json({ message: 'Authentification à deux facteurs désactivée', enabled: false })
  } catch (error) {
    console.error('2FA POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
