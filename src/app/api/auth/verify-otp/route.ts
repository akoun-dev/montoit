import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { phone, email, code } = body

    // Must provide either phone or email plus code
    if ((!phone && !email) || !code) {
      return NextResponse.json(
        { error: 'Identifiant et code requis' },
        { status: 400 }
      )
    }

    // Find valid OTP by phone or email
    let otp
    if (phone) {
      otp = await db.oTPCode.findFirst({
        where: {
          phone,
          code,
          type: 'LOGIN',
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      })
    } else if (email) {
      otp = await db.oTPCode.findFirst({
        where: {
          email,
          code,
          type: 'LOGIN',
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      })
    }

    if (!otp) {
      return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 400 })
    }

    // Mark OTP as used
    await db.oTPCode.update({ where: { id: otp.id }, data: { isUsed: true } })

    // Find the user by phone or email
    let user = null
    if (phone) {
      user = await db.user.findUnique({
        where: { phone },
        include: {
          properties: { select: { id: true } },
          rentalFiles: { select: { id: true, status: true } },
        },
      })
    } else if (email) {
      user = await db.user.findUnique({
        where: { email },
        include: {
          properties: { select: { id: true } },
          rentalFiles: { select: { id: true, status: true } },
        },
      })
    }

    // If the user was created as a temp placeholder, they need registration
    if (user && user.firstName === 'Temp' && user.lastName === 'User' && !user.isPhoneVerified) {
      return NextResponse.json({
        needsRegistration: true,
        tempUserId: user.id,
        phone: user.phone,
        email: user.email,
      })
    }

    // For email login: also check if email is verified
    if (user && (user.isPhoneVerified || (email && user.email))) {
      // Update email verification status if logging in by email
      if (email && !user.isEmailVerified) {
        await db.user.update({
          where: { id: user.id },
          data: { isEmailVerified: true },
        })
        user.isEmailVerified = true
      }

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
    return NextResponse.json({
      needsRegistration: true,
      phone: phone || undefined,
      email: email || undefined,
    })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
