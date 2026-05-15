import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { email, phone, code, newPassword } = await req.json()

    if ((!email && !phone) || !code || !newPassword) {
      return NextResponse.json({ error: 'Identifiant, code et nouveau mot de passe requis' }, { status: 400 })
    }

    // Validate password strength
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return NextResponse.json({
        error: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre',
      }, { status: 400 })
    }

    // Find the valid PASSWORD_RESET OTP
    const whereClause = email
      ? { email, code, type: 'PASSWORD_RESET' as const, isUsed: false, expiresAt: { gt: new Date() } }
      : { phone, code, type: 'PASSWORD_RESET' as const, isUsed: false, expiresAt: { gt: new Date() } }

    const otp = await db.oTPCode.findFirst({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    })

    if (!otp) {
      return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 400 })
    }

    // Mark OTP as used
    await db.oTPCode.update({ where: { id: otp.id }, data: { isUsed: true } })

    // Find the user
    const user = email
      ? await db.user.findUnique({ where: { email } })
      : await db.user.findUnique({ where: { phone: phone! } })

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Hash new password and update
    const passwordHash = await bcrypt.hash(newPassword, 12)
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    return NextResponse.json({ message: 'Mot de passe réinitialisé avec succès' })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
