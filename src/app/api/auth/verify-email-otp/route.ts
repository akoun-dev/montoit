import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { email, code, purpose } = await req.json()

    if (!email || !code) {
      return NextResponse.json({ error: 'Email et code requis' }, { status: 400 })
    }

    const otpType = purpose === 'password_reset' ? 'PASSWORD_RESET' : 'EMAIL_VERIFY'

    // Find valid OTP
    const otp = await db.oTPCode.findFirst({
      where: {
        email,
        code,
        type: otpType,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!otp) {
      return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 400 })
    }

    // Mark OTP as used
    await db.oTPCode.update({ where: { id: otp.id }, data: { isUsed: true } })

    // Find the user by email
    const user = await db.user.findUnique({ where: { email } })

    if (otpType === 'EMAIL_VERIFY') {
      // If temp user (email verification during registration)
      if (user && user.firstName === 'Temp' && user.lastName === 'User' && !user.isEmailVerified) {
        return NextResponse.json({
          needsRegistration: true,
          email,
        })
      }

      // Mark email as verified for real user
      if (user) {
        await db.user.update({
          where: { id: user.id },
          data: { isEmailVerified: true },
        })

        const response = NextResponse.json({
          verified: true,
          user: {
            id: user.id,
            phone: user.phone,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            avatarUrl: user.avatarUrl,
            isActive: user.isActive,
            isEmailVerified: true,
          },
        })

        response.cookies.set('montoit-user-id', user.id, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
        })

        return response
      }

      return NextResponse.json({ needsRegistration: true, email })
    }

    // For PASSWORD_RESET type, just confirm the code is valid
    if (otpType === 'PASSWORD_RESET') {
      return NextResponse.json({
        valid: true,
        email,
      })
    }

    return NextResponse.json({ error: 'Type OTP non supporté' }, { status: 400 })
  } catch (error) {
    console.error('Verify Email OTP error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
