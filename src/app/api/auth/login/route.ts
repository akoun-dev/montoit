import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { generateOtpCode, sendOtpEmail } from '@/lib/ansut-messaging'
import { createSession, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/lib/session'

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10)

export async function POST(req: NextRequest) {
  try {
    const { email, password, phone } = await req.json()

    // Support email + password login
    if (email && password) {
      const user = await db.user.findUnique({ where: { email } })

      if (!user || !user.isActive) {
        return NextResponse.json(
          { error: 'Identifiants incorrects' },
          { status: 401 }
        )
      }

      const isValid = await bcrypt.compare(password, user.passwordHash)
      if (!isValid) {
        return NextResponse.json(
          { error: 'Identifiants incorrects' },
          { status: 401 }
        )
      }

      // Block login if email is not verified
      if (!user.isEmailVerified) {
        // Send a new verification email automatically
        const existingOtps = await db.oTPCode.findMany({
          where: { email, isUsed: false, type: 'EMAIL_VERIFY' },
        })
        for (const otp of existingOtps) {
          await db.oTPCode.update({ where: { id: otp.id }, data: { isUsed: true } })
        }

        const otpCode = generateOtpCode(6)
        await db.oTPCode.create({
          data: {
            email,
            code: otpCode,
            type: 'EMAIL_VERIFY',
            expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
            userId: user.id,
          },
        })

        // Send verification email
        const emailResult = await sendOtpEmail(email, otpCode, user.firstName, 'email_verify')
        if (!emailResult.success) {
          console.warn(`[Login] Email send failed for ${email}, but OTP stored. Code: ${otpCode}`)
        }

        const isDev = process.env.NODE_ENV !== 'production'
        return NextResponse.json(
          {
            error: 'Votre email n\'est pas encore vérifié. Un code de vérification vient d\'être envoyé.',
            needsVerification: true,
            email,
            ...(isDev && { devCode: otpCode }),
          },
          { status: 403 }
        )
      }

      // Create session
      const { token: sessionToken, expiresAt } = await createSession(user.id)

      const response = NextResponse.json({
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          activeRole: user.activeRole,
          avatarUrl: user.avatarUrl,
          isActive: user.isActive,
          isEmailVerified: user.isEmailVerified,
        },
      })

      response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
        ...SESSION_COOKIE_OPTIONS,
        maxAge: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
      })

      return response
    }

    return NextResponse.json(
      { error: 'Email et mot de passe requis' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
