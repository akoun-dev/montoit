import { NextRequest, NextResponse } from 'next/server'
import { generateOtpCode, sendOtpEmail } from '@/lib/ansut-messaging'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import {
  createEmailOtp,
  getUserProfileByEmail,
  invalidateEmailOtps,
} from '@/lib/supabase/email-auth'
import { checkRateLimit } from '@/lib/rate-limiter'

// 3 tentatives par email toutes les 60 secondes
const rateLimit = (email: string) =>
  checkRateLimit('otp-email', email, { maxRequests: 3, windowMs: 60_000 })

export async function POST(req: NextRequest) {
  try {
    const { email, purpose } = await req.json()

    // Rate limiting par adresse email
    if (email) {
      const { allowed } = rateLimit(email)
      if (!allowed) {
        return NextResponse.json(
          { error: 'Trop de tentatives. Veuillez réessayer dans une minute.' },
          { status: 429 }
        )
      }
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Adresse email requise' }, { status: 400 })
    }

    const otpType = purpose === 'password_reset' ? 'PASSWORD_RESET' : 'EMAIL_VERIFY'
    const admin = getSupabaseAdminClient()
    const user = await getUserProfileByEmail(admin, email)

    if (otpType === 'PASSWORD_RESET' && !user) {
      return NextResponse.json({ error: 'Aucun compte associé à cet email' }, { status: 404 })
    }

    if (otpType === 'EMAIL_VERIFY' && !user) {
      return NextResponse.json({ error: 'Aucun compte en attente pour cet email' }, { status: 404 })
    }

    if (otpType === 'EMAIL_VERIFY' && user?.is_email_verified) {
      return NextResponse.json({ error: 'Cet email est déjà vérifié' }, { status: 400 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    await invalidateEmailOtps(admin, user.email, otpType)

    const otpCode = generateOtpCode(6)
    await createEmailOtp(admin, {
      email: user.email,
      code: otpCode,
      type: otpType,
      userId: user.id,
    })

    const emailPurpose = otpType === 'PASSWORD_RESET' ? 'password_reset' : 'email_verify'
    const emailResult = await sendOtpEmail(user.email, otpCode, user.first_name, emailPurpose)

    if (!emailResult.success) {
      console.warn(`[Send Email OTP] Email send failed for ${user.email}, but OTP stored in DB. Code: ${otpCode}`)
    }

    const isDev = process.env.NODE_ENV !== 'production'

    return NextResponse.json({
      exists: true,
      message: 'Code de vérification envoyé par email',
      ...(isDev && { devCode: otpCode }),
    })
  } catch (error) {
    console.error('Send Email OTP error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
