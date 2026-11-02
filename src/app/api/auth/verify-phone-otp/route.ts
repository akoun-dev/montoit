import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp, userIpRateLimitKey } from '@/lib/rate-limiter'
import { normalizePhone } from '@/lib/ansut-messaging'
import { hashOtpCode, verifyOtpCandidate } from '@/lib/otp-hash'

export async function POST(req: NextRequest) {
  try {
    const { phone, code } = await req.json()

    if (!phone || !code) {
      return NextResponse.json({ error: 'Numéro et code requis' }, { status: 400 })
    }

    const normalizedPhone = normalizePhone(phone)

    // Rate limiting par numéro de téléphone (anti-spam courte durée)
    const { allowed } = checkRateLimit('otp-verify', normalizedPhone, { maxRequests: 10, windowMs: 60_000 })
    if (!allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Veuillez réessayer dans une minute.' },
        { status: 429 }
      )
    }

    // SEC-007 — Rate-limit strict anti brute-force : 5 tentatives / 15 min
    // par couple numéro + IP.
    const strictAllowed = checkRateLimit(
      'otp-verify-strict',
      userIpRateLimitKey(normalizedPhone, getClientIp(req)),
      { maxRequests: 5, windowMs: 15 * 60_000 }
    )
    if (!strictAllowed.allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Veuillez réessayer dans 15 minutes.' },
        { status: 429, headers: { 'Retry-After': String(15 * 60) } }
      )
    }

    const supabase = getSupabaseAdminClient()

    // SEC-007 — comparaison via hash (migration douce des lignes legacy).
    const { data: otp } = await supabase
      .from('otp_codes')
      .select('id, user_id, code')
      .eq('phone', normalizedPhone)
      .eq('type', 'PHONE_VERIFY')
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!otp) {
      return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 400 })
    }

    const verdict = verifyOtpCandidate(code, normalizedPhone, otp.code)
    if (!verdict.matched) {
      return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 400 })
    }

    if (verdict.needsRehash) {
      await supabase
        .from('otp_codes')
        .update({ code: hashOtpCode(code.trim(), normalizedPhone) })
        .eq('id', otp.id)
    }

    await supabase
      .from('otp_codes')
      .update({ is_used: true })
      .eq('id', otp.id)

    const { error: updateError } = await supabase
      .from('users')
      .update({ is_phone_verified: true })
      .eq('id', otp.user_id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      verified: true,
      message: 'Numéro de téléphone vérifié avec succès',
    })
  } catch (error) {
    console.error('Verify Phone OTP error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
