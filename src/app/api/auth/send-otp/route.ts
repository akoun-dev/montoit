import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Numéro de téléphone requis' }, { status: 400 })
    }

    // Check if user exists
    const user = await db.user.findUnique({ where: { phone } })

    // For demo: always create OTP code "123456"
    // First, invalidate any existing unused OTP codes for this phone
    const existingOtps = await db.oTPCode.findMany({
      where: { phone, isUsed: false, type: 'LOGIN' },
    })

    for (const otp of existingOtps) {
      await db.oTPCode.update({ where: { id: otp.id }, data: { isUsed: true } })
    }

    // Create a temporary user if none exists (just for OTP relation)
    let otpUserId = user?.id
    if (!otpUserId) {
      // Create a placeholder user for the OTP relation
      const tempUser = await db.user.create({
        data: {
          phone,
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
        phone,
        code: '123456',
        type: 'LOGIN',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
        userId: otpUserId,
      },
    })

    return NextResponse.json({
      exists: !!user,
      message: 'OTP envoyé avec succès',
    })
  } catch (error) {
    console.error('Send OTP error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
