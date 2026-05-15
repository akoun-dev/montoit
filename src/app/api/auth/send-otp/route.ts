import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { phone, email } = body

    // Must provide either phone or email
    if (!phone && !email) {
      return NextResponse.json(
        { error: 'Numéro de téléphone ou adresse email requis' },
        { status: 400 }
      )
    }

    if (phone && typeof phone !== 'string') {
      return NextResponse.json({ error: 'Numéro de téléphone invalide' }, { status: 400 })
    }

    if (email && typeof email !== 'string') {
      return NextResponse.json({ error: 'Adresse email invalide' }, { status: 400 })
    }

    // Check if user exists
    let user = null
    if (phone) {
      user = await db.user.findUnique({ where: { phone } })
    } else if (email) {
      user = await db.user.findUnique({ where: { email } })
    }

    // Invalidate any existing unused OTP codes for this identifier
    if (phone) {
      const existingOtps = await db.oTPCode.findMany({
        where: { phone, isUsed: false, type: 'LOGIN' },
      })
      for (const otp of existingOtps) {
        await db.oTPCode.update({ where: { id: otp.id }, data: { isUsed: true } })
      }
    }
    if (email) {
      const existingOtps = await db.oTPCode.findMany({
        where: { email, isUsed: false, type: 'LOGIN' },
      })
      for (const otp of existingOtps) {
        await db.oTPCode.update({ where: { id: otp.id }, data: { isUsed: true } })
      }
    }

    // Create a temporary user if none exists (just for OTP relation)
    let otpUserId = user?.id
    if (!otpUserId) {
      const tempUser = await db.user.create({
        data: {
          phone: phone || `temp-${Date.now()}`,
          email: email || null,
          firstName: 'Temp',
          lastName: 'User',
          isPhoneVerified: false,
        },
      })
      otpUserId = tempUser.id
    }

    // Create new OTP
    await db.oTPCode.create({
      data: {
        phone: phone || null,
        email: email || null,
        code: '123456',
        type: 'LOGIN',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
        userId: otpUserId,
      },
    })

    return NextResponse.json({
      exists: !!user,
      message: phone ? 'OTP envoyé par SMS' : 'OTP envoyé par email',
    })
  } catch (error) {
    console.error('Send OTP error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
