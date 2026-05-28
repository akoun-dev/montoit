import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { generateOtpCode, sendOtpEmail, sendOtpSms, normalizePhone } from '@/lib/ansut-messaging'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import {
  createEmailOtp,
  getUserProfileByEmail,
  invalidateEmailOtps,
} from '@/lib/supabase/email-auth'

export async function POST(req: NextRequest) {
  try {
    const { identifier } = await req.json()

    if (!identifier || typeof identifier !== 'string') {
      return NextResponse.json({ error: 'Email ou numéro de téléphone requis' }, { status: 400 })
    }

    const isEmail = identifier.includes('@')

    if (isEmail) {
      const admin = getSupabaseAdminClient()
      const user = await getUserProfileByEmail(admin, identifier)

      if (!user) {
        return NextResponse.json(
          { error: 'Aucun compte associé à cet email' },
          { status: 404 }
        )
      }

      if (!user.is_active) {
        return NextResponse.json(
          { error: 'Ce compte a été désactivé' },
          { status: 403 }
        )
      }

      await invalidateEmailOtps(admin, user.email, 'PASSWORD_RESET')

      const otpCode = generateOtpCode(6)
      await createEmailOtp(admin, {
        email: user.email,
        code: otpCode,
        type: 'PASSWORD_RESET',
        userId: user.id,
      })

      const emailResult = await sendOtpEmail(user.email, otpCode, user.first_name, 'password_reset')
      if (!emailResult.success) {
        console.warn(`[Forgot Password] Email send failed for ${user.email}, but OTP stored. Code: ${otpCode}`)
      }

      const isDev = process.env.NODE_ENV !== 'production'
      return NextResponse.json({
        message: 'Si un compte existe avec ces informations, un code de réinitialisation sera envoyé',
        ...(isDev && { devCode: otpCode }),
      })
    }

    const supabase = getSupabaseAdminClient()
    const normalizedPhone = normalizePhone(identifier)

    const { data: user } = await supabase
      .from('users')
      .select('id, email, first_name, is_active')
      .eq('phone', normalizedPhone)
      .maybeSingle()

    if (!user) {
      return NextResponse.json(
        { error: 'Aucun compte associé à ce numéro' },
        { status: 404 }
      )
    }

    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Ce compte a été désactivé' },
        { status: 403 }
      )
    }

    const { data: existingOtps } = await supabase
      .from('otp_codes')
      .select('id')
      .eq('phone', normalizedPhone)
      .eq('is_used', false)
      .eq('type', 'PASSWORD_RESET')

    if (existingOtps) {
      for (const otp of existingOtps) {
        await supabase
          .from('otp_codes')
          .update({ is_used: true })
          .eq('id', otp.id)
      }
    }

    const otpCode = generateOtpCode(6)
    await supabase
      .from('otp_codes')
      .insert({
        id: crypto.randomUUID(),
        email: user.email,
        phone: normalizedPhone,
        code: otpCode,
        type: 'PASSWORD_RESET',
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        user_id: user.id,
      })

    const smsResult = await sendOtpSms(normalizedPhone, otpCode, 'password_reset')
    if (!smsResult.success) {
      console.warn(`[Forgot Password] SMS send failed for ${identifier}, but OTP stored. Code: ${otpCode}`)
    }

    const isDev = process.env.NODE_ENV !== 'production'
    return NextResponse.json({
      message: 'Si un compte existe avec ces informations, un code de réinitialisation sera envoyé',
      ...(isDev && { devCode: otpCode }),
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
