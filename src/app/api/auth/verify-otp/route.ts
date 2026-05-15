import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { phone, code } = await req.json()

    if (!phone || !code) {
      return NextResponse.json({ error: 'Numéro et code requis' }, { status: 400 })
    }

    // Find valid OTP
    const otp = await db.oTPCode.findFirst({
      where: {
        phone,
        code,
        type: 'LOGIN',
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

    // Check if real user exists with this phone (not the temp one)
    const user = await db.user.findUnique({
      where: { phone },
      include: {
        properties: { select: { id: true } },
        rentalFiles: { select: { id: true, status: true } },
      },
    })

    // If the user was created as a temp placeholder (firstName = 'Temp', lastName = 'User', isPhoneVerified = false)
    // and they're trying to verify, they need registration
    if (user && user.firstName === 'Temp' && user.lastName === 'User' && !user.isPhoneVerified) {
      return NextResponse.json({
        needsRegistration: true,
        tempUserId: user.id,
        phone,
      })
    }

    if (user && user.isPhoneVerified) {
      // Set auth cookie
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
          isPhoneVerified: user.isPhoneVerified,
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

    // No verified user found
    return NextResponse.json({ needsRegistration: true, phone })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
