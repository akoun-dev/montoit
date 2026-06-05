import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { normalizePhone } from '@/lib/ansut-messaging'
import { checkRateLimit } from '@/lib/rate-limiter'

export async function POST(req: NextRequest) {
  const auth = await resolveRequestUser(req)
  const { userId, applyCookies } = auth
  try {
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const { newPhone, code } = await req.json()
    if (!newPhone || !code) {
      return NextResponse.json({ error: 'Numéro et code requis' }, { status: 400 })
    }

    const normalizedPhone = normalizePhone(newPhone)
    if (normalizedPhone.length !== 10) {
      return NextResponse.json({ error: 'Numéro de téléphone invalide' }, { status: 400 })
    }

    const { allowed } = checkRateLimit('otp-verify', normalizedPhone, { maxRequests: 10, windowMs: 60_000 })
    if (!allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Veuillez réessayer dans une minute.' },
        { status: 429 }
      )
    }

    const admin = getSupabaseAdminClient()

    const { data: otp } = await admin
      .from('otp_codes')
      .select('id')
      .eq('user_id', userId)
      .eq('phone', normalizedPhone)
      .eq('code', code.trim())
      .eq('type', 'PHONE_CHANGE')
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!otp) {
      return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 400 })
    }

    const { error: markUsedError } = await admin
      .from('otp_codes')
      .update({ is_used: true })
      .eq('id', otp.id)

    if (markUsedError) throw markUsedError

    const { error: updateError } = await admin
      .from('users')
      .update({ phone: normalizedPhone, is_phone_verified: true })
      .eq('id', userId)

    if (updateError) throw updateError

    const resp = NextResponse.json({
      verified: true,
      phone: normalizedPhone,
    })
    return applyCookies(resp)
  } catch (error) {
    console.error('[Change Phone Verify] Error:', error)
    const resp = NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return applyCookies ? applyCookies(resp) : resp
  }
}
