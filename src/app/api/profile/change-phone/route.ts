import { NextRequest, NextResponse } from 'next/server'
import { generateOtpCode, sendOtpSms, normalizePhone } from '@/lib/ansut-messaging'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
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

    const { newPhone } = await req.json()
    if (!newPhone || typeof newPhone !== 'string') {
      return NextResponse.json({ error: 'Nouveau numéro de téléphone requis' }, { status: 400 })
    }

    const normalizedPhone = normalizePhone(newPhone)
    if (normalizedPhone.length !== 10) {
      return NextResponse.json({ error: 'Numéro de téléphone invalide (10 chiffres requis)' }, { status: 400 })
    }

    const { allowed } = checkRateLimit('otp-sms', normalizedPhone, { maxRequests: 3, windowMs: 60_000 })
    if (!allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Veuillez réessayer dans une minute.' },
        { status: 429 }
      )
    }

    const admin = getSupabaseAdminClient()

    const { data: currentUser } = await admin
      .from('users')
      .select('phone')
      .eq('id', userId)
      .single()

    if (currentUser?.phone === normalizedPhone) {
      return NextResponse.json({ error: 'Ceci est déjà votre numéro de téléphone actuel' }, { status: 400 })
    }

    const { data: existingUser } = await admin
      .from('users')
      .select('id')
      .eq('phone', normalizedPhone)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json({ error: 'Ce numéro est déjà utilisé par un autre compte' }, { status: 409 })
    }

    await admin
      .from('otp_codes')
      .update({ is_used: true })
      .eq('user_id', userId)
      .eq('type', 'PHONE_CHANGE')
      .eq('is_used', false)

    const otpCode = generateOtpCode(6)

    await admin.from('otp_codes').insert({
      id: crypto.randomUUID(),
      phone: normalizedPhone,
      code: otpCode,
      type: 'PHONE_CHANGE',
      expires_at: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString(),
      user_id: userId,
    })

    const smsResult = await sendOtpSms(normalizedPhone, otpCode, 'login')
    if (!smsResult.success) {
      return NextResponse.json(
        { error: "Impossible d'envoyer le SMS. Vérifiez que le numéro est valide." },
        { status: 502 }
      )
    }

    const isDev = process.env.NODE_ENV !== 'production'

    const resp = NextResponse.json({
      message: 'Code de vérification envoyé par SMS',
      ...(isDev && { devCode: otpCode }),
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('[Change Phone] Error:', error)
    const resp = NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return applyCookies ? applyCookies(resp) : resp
  }
}
