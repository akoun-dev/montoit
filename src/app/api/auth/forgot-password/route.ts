import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateOtpCode, sendOtpEmail, sendOtpSms } from '@/lib/ansut-messaging'

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10)

export async function POST(req: NextRequest) {
  try {
    const { identifier, method } = await req.json()
    // identifier = email or phone number

    if (!identifier || typeof identifier !== 'string') {
      return NextResponse.json({ error: 'Email ou numéro de téléphone requis' }, { status: 400 })
    }

    // Determine if identifier is email or phone
    const isEmail = identifier.includes('@')

    let user = null

    if (isEmail) {
      user = await db.user.findUnique({ where: { email: identifier } })
    } else {
      user = await db.user.findUnique({ where: { phone: identifier } })
    }

    // Always return a generic success message to prevent user enumeration
    if (!user) {
      // Still return success to avoid revealing whether account exists
      return NextResponse.json({
        message: 'Si un compte existe avec ces informations, un code de réinitialisation sera envoyé',
      })
    }

    if (!user.isActive) {
      return NextResponse.json({
        message: 'Si un compte existe avec ces informations, un code de réinitialisation sera envoyé',
      })
    }

    // Invalidate existing unused PASSWORD_RESET OTP codes
    const whereClause = isEmail
      ? { email: identifier, isUsed: false, type: 'PASSWORD_RESET' as const }
      : { phone: identifier, isUsed: false, type: 'PASSWORD_RESET' as const }

    const existingOtps = await db.oTPCode.findMany({ where: whereClause })
    for (const otp of existingOtps) {
      await db.oTPCode.update({ where: { id: otp.id }, data: { isUsed: true } })
    }

    // Generate OTP code
    const otpCode = generateOtpCode(6)

    // Store OTP in database
    await db.oTPCode.create({
      data: {
        email: isEmail ? identifier : user.email,
        phone: !isEmail ? identifier : user.phone,
        code: otpCode,
        type: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
        userId: user.id,
      },
    })

    // Send OTP via the appropriate channel
    if (isEmail) {
      const emailResult = await sendOtpEmail(identifier, otpCode, user.firstName, 'password_reset')
      if (!emailResult.success) {
        console.warn(`[Forgot Password] Email send failed for ${identifier}, but OTP stored. Code: ${otpCode}`)
      }
    } else {
      const smsResult = await sendOtpSms(identifier, otpCode, 'password_reset')
      if (!smsResult.success) {
        console.warn(`[Forgot Password] SMS send failed for ${identifier}, but OTP stored. Code: ${otpCode}`)
      }
    }

    // In development, include the OTP code in response for testing
    const isDev = process.env.NODE_ENV !== 'production'

    return NextResponse.json({
      message: 'Si un compte existe avec ces informations, un code de réinitialisation sera envoyé',
      ...(isDev && { devCode: otpCode }), // Only in development
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
