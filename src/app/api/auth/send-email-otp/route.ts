import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateOtpCode, sendOtpEmail } from '@/lib/ansut-messaging'

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10)

export async function POST(req: NextRequest) {
  try {
    const { email, purpose } = await req.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Adresse email requise' }, { status: 400 })
    }

    const otpType = purpose === 'password_reset' ? 'PASSWORD_RESET' : 'EMAIL_VERIFY'

    // Check if user exists with this email
    const user = await db.user.findUnique({ where: { email } })

    // For password reset, user must exist
    if (otpType === 'PASSWORD_RESET' && !user) {
      return NextResponse.json({ error: 'Aucun compte associé à cet email' }, { status: 404 })
    }

    // For email verification during registration, user might not exist yet
    // But if they do and email is already verified, skip
    if (otpType === 'EMAIL_VERIFY' && user?.isEmailVerified) {
      return NextResponse.json({ error: 'Cet email est déjà vérifié' }, { status: 400 })
    }

    // Invalidate existing unused OTP codes for this email and type
    const existingOtps = await db.oTPCode.findMany({
      where: { email, isUsed: false, type: otpType },
    })
    for (const otp of existingOtps) {
      await db.oTPCode.update({ where: { id: otp.id }, data: { isUsed: true } })
    }

    // We need a userId for the OTP record
    let otpUserId = user?.id
    if (!otpUserId) {
      // For email verification flow where user doesn't exist yet,
      // create a temp user placeholder
      const tempUser = await db.user.create({
        data: {
          email,
          phone: null,
          passwordHash: 'TEMP_EMAIL_VERIFY',
          firstName: 'Temp',
          lastName: 'User',
          isEmailVerified: false,
        },
      })
      otpUserId = tempUser.id
    }

    // Generate a random OTP code
    const otpCode = generateOtpCode(6)

    // Store OTP in database
    await db.oTPCode.create({
      data: {
        email,
        code: otpCode,
        type: otpType,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
        userId: otpUserId,
      },
    })

    // Send OTP via ANSUT Email API
    const firstName = user?.firstName || 'Utilisateur'
    const emailPurpose = otpType === 'PASSWORD_RESET' ? 'password_reset' : 'email_verify'
    const emailResult = await sendOtpEmail(email, otpCode, firstName, emailPurpose)

    if (!emailResult.success) {
      console.warn(`[Send Email OTP] Email send failed for ${email}, but OTP stored in DB. Code: ${otpCode}`)
    }

    // In development, include the OTP code in response for testing
    const isDev = process.env.NODE_ENV !== 'production'

    return NextResponse.json({
      exists: !!user,
      message: 'Code de vérification envoyé par email',
      ...(isDev && { devCode: otpCode }), // Only in development
    })
  } catch (error) {
    console.error('Send Email OTP error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
