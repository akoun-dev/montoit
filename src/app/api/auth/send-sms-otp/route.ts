import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Numéro de téléphone requis' }, { status: 400 })
    }

    // Check if user exists with this phone
    const user = await db.user.findUnique({ where: { phone } })

    // Invalidate existing unused OTP codes for this phone
    const existingOtps = await db.oTPCode.findMany({
      where: { phone, isUsed: false, type: 'LOGIN' },
    })
    for (const otp of existingOtps) {
      await db.oTPCode.update({ where: { id: otp.id }, data: { isUsed: true } })
    }

    // Create a temp user if none exists (needed for OTP relation)
    let otpUserId = user?.id
    if (!otpUserId) {
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

    // Create new OTP (demo code: 123456)
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
      message: 'OTP envoyé par SMS',
    })
  } catch (error) {
    console.error('Send SMS OTP error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
