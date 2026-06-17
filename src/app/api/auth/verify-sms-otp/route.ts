import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSession, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/lib/session'
import { checkRateLimit } from '@/lib/rate-limiter'
import { normalizePhone } from '@/lib/ansut-messaging'

export async function POST(req: NextRequest) {
  try {
    const { phone, code, purpose } = await req.json()

    if (!phone || !code) {
      return NextResponse.json({ error: 'Numéro et code requis' }, { status: 400 })
    }

    const normalizedPhone = normalizePhone(phone)

    // Rate limiting par numéro de téléphone
    const { allowed } = checkRateLimit('otp-verify', normalizedPhone, { maxRequests: 10, windowMs: 60_000 })
    if (!allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Veuillez réessayer dans une minute.' },
        { status: 429 }
      )
    }

    const supabase = getSupabaseAdminClient()
    const otpType = purpose === 'password_reset' ? 'PASSWORD_RESET' : 'LOGIN'

    const { data: otp } = await supabase
      .from('otp_codes')
      .select('id, user_id')
      .eq('phone', normalizedPhone)
      .eq('code', code)
      .eq('type', otpType)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!otp) {
      return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 400 })
    }

    const { data: updatedOtp } = await supabase
      .from('otp_codes')
      .update({ is_used: true })
      .eq('id', otp.id)
      .eq('is_used', false)
      .select('id')
      .maybeSingle()

    if (!updatedOtp) {
      return NextResponse.json({ error: 'Code déjà utilisé ou expiré' }, { status: 400 })
    }

    if (otpType === 'PASSWORD_RESET') {
      return NextResponse.json({
        valid: true,
        phone: normalizedPhone,
      })
    }

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('phone', normalizedPhone)
      .maybeSingle()

    if (user && user.first_name === 'Temp' && user.last_name === 'User' && !user.is_phone_verified) {
      return NextResponse.json({
        needsRegistration: true,
        phone: normalizedPhone,
      })
    }

    if (user && user.is_active) {
      if (!user.is_phone_verified) {
        await supabase
          .from('users')
          .update({ is_phone_verified: true })
          .eq('id', user.id)
      }

      const { token: sessionToken, expiresAt } = await createSession(supabase, user.id)

      const response = NextResponse.json({
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          activeRole: user.active_role,
          avatarUrl: user.avatar_url,
          isActive: user.is_active,
          isEmailVerified: user.is_email_verified,
        },
      })

      response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
        ...SESSION_COOKIE_OPTIONS,
        maxAge: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
      })

      return response
    }

    return NextResponse.json({ needsRegistration: true, phone: normalizedPhone })
  } catch (error) {
    console.error('Verify SMS OTP error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
