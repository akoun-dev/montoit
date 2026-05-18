import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import {
  findValidEmailOtp,
  getUserProfileByEmail,
  normalizeEmail,
} from '@/lib/supabase/email-auth'

export async function POST(req: NextRequest) {
  try {
    const { email, code, purpose } = await req.json()

    if (!email || !code) {
      return NextResponse.json({ error: 'Email et code requis' }, { status: 400 })
    }

    const admin = getSupabaseAdminClient()
    const normalizedEmail = normalizeEmail(email)
    const otpType = purpose === 'password_reset' ? 'PASSWORD_RESET' : 'EMAIL_VERIFY'

    const otp = await findValidEmailOtp(admin, {
      email: normalizedEmail,
      code,
      type: otpType,
    })

    if (!otp) {
      return NextResponse.json(
        { error: 'Code invalide ou expiré. Veuillez vérifier le code ou demander un nouveau.' },
        { status: 400 }
      )
    }

    const { error: markUsedError } = await admin
      .from('otp_codes')
      .update({ is_used: true })
      .eq('id', otp.id)

    if (markUsedError) {
      throw markUsedError
    }

    if (otpType === 'PASSWORD_RESET') {
      return NextResponse.json({
        valid: true,
        email: normalizedEmail,
      })
    }

    const user = await getUserProfileByEmail(admin, normalizedEmail)
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    const { error: updateError } = await admin
      .from('users')
      .update({ is_email_verified: true })
      .eq('id', user.id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      verified: true,
      requiresLogin: true,
      email: normalizedEmail,
    })
  } catch (error) {
    console.error('Verify Email OTP error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
