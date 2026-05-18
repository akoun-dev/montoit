import { NextRequest, NextResponse } from 'next/server'
import { generateOtpCode, sendOtpSms } from '@/lib/ansut-messaging'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10)

export async function POST(req: NextRequest) {
  try {
    const { phone, purpose } = await req.json()

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Numéro de téléphone requis' }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()
    const otpType = purpose === 'password_reset' ? 'PASSWORD_RESET' : 'LOGIN'

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .maybeSingle()

    if (otpType === 'PASSWORD_RESET' && !user) {
      return NextResponse.json({ error: 'Aucun compte associé à ce numéro' }, { status: 404 })
    }

    const { data: existingOtps } = await supabase
      .from('otp_codes')
      .select('id')
      .eq('phone', phone)
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

    let otpUserId = user?.id
    if (!otpUserId && otpType === 'LOGIN') {
      const { data: tempUser } = await supabase
        .from('users')
          .insert({
            phone,
            email: `temp-sms-${Date.now()}@temp.ci`,
            password_hash: 'TEMP',
            first_name: 'Temp',
            last_name: 'User',
            role: 'LOCATAIRE' as any,
            is_phone_verified: false,
          } as any)
        .select('id')
        .single()
      otpUserId = tempUser?.id
    }

    if (!otpUserId) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    const otpCode = generateOtpCode(6)

    await supabase
      .from('otp_codes')
      .insert({
        phone,
        code: otpCode,
        type: otpType,
        expires_at: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString(),
        user_id: otpUserId,
      })

    const smsPurpose = otpType === 'PASSWORD_RESET' ? 'password_reset' : 'login'
    const smsResult = await sendOtpSms(phone, otpCode, smsPurpose)

    if (!smsResult.success) {
      console.warn(`[Send SMS OTP] SMS send failed for ${phone}, but OTP stored in DB. Code: ${otpCode}`)
    }

    const isDev = process.env.NODE_ENV !== 'production'

    return NextResponse.json({
      exists: !!user,
      message: 'OTP envoyé par SMS',
      ...(isDev && { devCode: otpCode }),
    })
  } catch (error) {
    console.error('Send SMS OTP error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
