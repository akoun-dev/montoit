import { NextRequest, NextResponse } from 'next/server'
import { generateOtpCode, sendOtpEmail } from '@/lib/ansut-messaging'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { normalizeEmail, getUserProfileByEmail } from '@/lib/supabase/email-auth'
import { checkRateLimit } from '@/lib/rate-limiter'
import crypto from 'crypto'

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10)

export async function POST(req: NextRequest) {
  const auth = await resolveRequestUser(req)
  const { userId, applyCookies } = auth
  try {
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const { newEmail } = await req.json()
    if (!newEmail || typeof newEmail !== 'string') {
      return NextResponse.json({ error: 'Nouvelle adresse email requise' }, { status: 400 })
    }

    const normalizedEmail = normalizeEmail(newEmail)

    const { allowed } = checkRateLimit('otp-email', normalizedEmail, { maxRequests: 3, windowMs: 60_000 })
    if (!allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Veuillez réessayer dans une minute.' },
        { status: 429 }
      )
    }

    const admin = getSupabaseAdminClient()

    const { data: currentUser } = await admin
      .from('users')
      .select('email')
      .eq('id', userId)
      .single()

    if (currentUser?.email === normalizedEmail) {
      return NextResponse.json({ error: 'Ceci est déjà votre adresse email actuelle' }, { status: 400 })
    }

    const existingUser = await getUserProfileByEmail(admin, normalizedEmail)
    if (existingUser) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé par un autre compte' }, { status: 409 })
    }

    await admin
      .from('otp_codes')
      .update({ is_used: true })
      .eq('user_id', userId)
      .eq('type', 'EMAIL_CHANGE')
      .eq('is_used', false)

    const otpCode = generateOtpCode(6)

    await admin.from('otp_codes').insert({
      id: crypto.randomUUID(),
      email: normalizedEmail,
      code: otpCode,
      type: 'EMAIL_CHANGE',
      expires_at: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString(),
      user_id: userId,
    })

    const emailResult = await sendOtpEmail(normalizedEmail, otpCode, 'Utilisateur', 'email_verify')
    if (!emailResult.success) {
      console.warn(`[Change Email] Email send failed for ${normalizedEmail}, but OTP stored. Code: ${otpCode}`)
    }

    const isDev = process.env.NODE_ENV !== 'production'

    const resp = NextResponse.json({
      message: 'Code de vérification envoyé à ' + normalizedEmail,
      ...(isDev && { devCode: otpCode }),
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('[Change Email] Error:', error)
    const resp = NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return applyCookies ? applyCookies(resp) : resp
  }
}
