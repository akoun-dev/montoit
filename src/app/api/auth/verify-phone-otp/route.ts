import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limiter'

export async function POST(req: NextRequest) {
  try {
    const { phone, code } = await req.json()

    if (!phone || !code) {
      return NextResponse.json({ error: 'Numéro et code requis' }, { status: 400 })
    }

    // Rate limiting par numéro de téléphone
    const { allowed } = checkRateLimit('otp-verify', phone, { maxRequests: 10, windowMs: 60_000 })
    if (!allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Veuillez réessayer dans une minute.' },
        { status: 429 }
      )
    }

    const supabase = getSupabaseAdminClient()

    const { data: otp } = await supabase
      .from('otp_codes')
      .select('id, user_id')
      .eq('phone', phone)
      .eq('code', code)
      .eq('type', 'PHONE_VERIFY')
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!otp) {
      return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 400 })
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
