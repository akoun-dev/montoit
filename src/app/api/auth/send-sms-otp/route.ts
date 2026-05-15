import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateOtpCode, sendOtpSms } from '@/lib/ansut-messaging'

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10)

export async function POST(req: NextRequest) {
  try {
    const { phone, purpose } = await req.json()

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Numéro de téléphone requis' }, { status: 400 })
    }

    const otpType = purpose === 'password_reset' ? 'PASSWORD_RESET' : 'LOGIN'

    // Check if user exists with this phone
    const user = await db.user.findUnique({ where: { phone } })

    // For password reset, user must exist
    if (otpType === 'PASSWORD_RESET' && !user) {
      return NextResponse.json({ error: 'Aucun compte associé à ce numéro' }, { status: 404 })
    }

    // Invalidate existing unused OTP codes for this phone and type
    const existingOtps = await db.oTPCode.findMany({
      where: { phone, isUsed: false, type: otpType },
    })
    for (const otp of existingOtps) {
      await db.oTPCode.update({ where: { id: otp.id }, data: { isUsed: true } })
    }

    // Create a temp user if none exists (needed for OTP relation) — only for LOGIN type
    let otpUserId = user?.id
    if (!otpUserId && otpType === 'LOGIN') {
      const tempUser = await db.user.create({
        data: {
          phone,
          email: `temp-sms-${Date.now()}@temp.ci`,
          passwordHash: 'TEMP',
          firstName: 'Temp',
          lastName: 'User',
          isPhoneVerified: false,
        },
      })
      otpUserId = tempUser.id
    }

    if (!otpUserId) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Generate a random OTP code
    const otpCode = generateOtpCode(6)

    // Store OTP in database
    await db.oTPCode.create({
      data: {
        phone,
        code: otpCode,
        type: otpType,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
        userId: otpUserId,
      },
    })

    // Send OTP via ANSUT SMS API
    const smsPurpose = otpType === 'PASSWORD_RESET' ? 'password_reset' : 'login'
    const smsResult = await sendOtpSms(phone, otpCode, smsPurpose)

    if (!smsResult.success) {
      console.warn(`[Send SMS OTP] SMS send failed for ${phone}, but OTP stored in DB. Code: ${otpCode}`)
      // We still return success so the user can enter the OTP — in dev mode, 
      // the code is logged and can be used for testing
    }

    // In development, include the OTP code in response for testing
    const isDev = process.env.NODE_ENV !== 'production'

    return NextResponse.json({
      exists: !!user,
      message: 'OTP envoyé par SMS',
      ...(isDev && { devCode: otpCode }), // Only in development
    })
  } catch (error) {
    console.error('Send SMS OTP error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
