import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/session'
import bcrypt from 'bcryptjs'

/**
 * PUT /api/settings/password — Change password (requires current password)
 */
export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await req.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Mot de passe actuel et nouveau mot de passe requis' }, { status: 400 })
    }

    // Validate new password strength
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return NextResponse.json({
        error: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre',
      }, { status: 400 })
    }

    // Get user with password hash
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isCurrentPasswordValid) {
      return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 400 })
    }

    // Hash and save new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12)
    await db.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash, passwordUpdatedAt: new Date() },
    })

    // Log the password change in audit log
    await db.auditLog.create({
      data: {
        action: 'PASSWORD_CHANGE',
        entity: 'User',
        entityId: userId,
        userId,
      },
    })

    return NextResponse.json({ message: 'Mot de passe mis à jour avec succès' })
  } catch (error) {
    console.error('Password change error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
