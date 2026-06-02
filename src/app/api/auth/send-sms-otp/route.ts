import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { generateOtpCode, sendOtpSms, normalizePhone } from '@/lib/ansut-messaging'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limiter'

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10)

// 3 tentatives par numéro toutes les 60 secondes
const rateLimit = (phone: string) =>
  checkRateLimit('otp-sms', phone, { maxRequests: 3, windowMs: 60_000 })

export async function POST(req: NextRequest) {
  try {
    const { phone, purpose } = await req.json()

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Numéro de téléphone requis' }, { status: 400 })
    }

    const normalizedPhone = normalizePhone(phone)
    if (normalizedPhone.length !== 10) {
      return NextResponse.json({ error: 'Numéro de téléphone invalide (10 chiffres requis)' }, { status: 400 })
    }

    // Rate limiting par numéro de téléphone
    const { allowed } = rateLimit(normalizedPhone)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Veuillez réessayer dans une minute.' },
        { status: 429 }
      )
    }
    const supabase = getSupabaseAdminClient()
    const otpType = purpose === 'password_reset' ? 'PASSWORD_RESET' : purpose === 'phone_verify' ? 'PHONE_VERIFY' : 'LOGIN'

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('phone', normalizedPhone)
      .maybeSingle()

    if (!user) {
      return NextResponse.json({ error: 'Aucun compte associé à ce numéro' }, { status: 404 })
    }

    const { data: existingOtps } = await supabase
      .from('otp_codes')
      .select('id')
      .eq('phone', normalizedPhone)
      .eq('is_used', false)
      .eq('type', otpType)

    if (existingOtps) {
      for (const otp of existingOtps) {
        await supabase
          .from('otp_codes')
          .update({ is_used: true })
          .eq('id', otp.id)
      }
    }

    const otpUserId = user.id

    const otpCode = generateOtpCode(6)

    await supabase
      .from('otp_codes')
      .insert({
        id: crypto.randomUUID(),
        phone: normalizedPhone,
        code: otpCode,
        type: otpType,
        expires_at: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString(),
        user_id: otpUserId,
      })

    const smsPurpose = otpType === 'PASSWORD_RESET' ? 'password_reset' : 'login'
    const smsResult = await sendOtpSms(normalizedPhone, otpCode, smsPurpose)

    if (!smsResult.success) {
      console.error(`[Send SMS OTP] SMS send failed for ${phone}: ${smsResult.message}`)
      return NextResponse.json(
        { error: 'Impossible d\'envoyer le SMS. Vérifiez que le numéro est valide ou réessayez plus tard.' },
        { status: 502 }
      )
    }

    const isDev = process.env.NODE_ENV !== 'production'

    return NextResponse.json({
      message: 'OTP envoyé par SMS',
      ...(isDev && { devCode: otpCode }),
    })
  } catch (error) {
    console.error('Send SMS OTP error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
