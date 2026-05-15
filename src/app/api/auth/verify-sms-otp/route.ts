import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { phone, code, purpose } = await req.json()

    if (!phone || !code) {
      return NextResponse.json({ error: 'Numéro et code requis' }, { status: 400 })
    }

    // Determine OTP type based on purpose
    const otpType = purpose === 'password_reset' ? 'PASSWORD_RESET' : 'LOGIN'

    // Find valid OTP
    const otp = await db.oTPCode.findFirst({
      where: {
        phone,
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

    // ─── PASSWORD_RESET: just confirm the code is valid ──────────────────
    if (otpType === 'PASSWORD_RESET') {
      return NextResponse.json({
        valid: true,
        phone,
      })
    }

    // ─── LOGIN flow ──────────────────────────────────────────────────────
    // Find the user by phone
    const user = await db.user.findUnique({
      where: { phone },
    })

    // If temp user (SMS registration flow) → needs registration
    if (user && user.firstName === 'Temp' && user.lastName === 'User' && !user.isPhoneVerified) {
      return NextResponse.json({
        needsRegistration: true,
        phone,
      })
    }

    // If real verified user → log them in
    if (user && user.isActive) {
      // Mark phone as verified
      if (!user.isPhoneVerified) {
        await db.user.update({
          where: { id: user.id },
          data: { isPhoneVerified: true },
        })
      }

      const response = NextResponse.json({
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          avatarUrl: user.avatarUrl,
          isActive: user.isActive,
          isEmailVerified: user.isEmailVerified,
        },
      })

      response.cookies.set('montoit-user-id', user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      })

      return response
    }

    // No active user found → needs registration
    return NextResponse.json({ needsRegistration: true, phone })
  } catch (error) {
    console.error('Verify SMS OTP error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
