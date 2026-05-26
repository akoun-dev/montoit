import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import {
  findValidEmailOtp,
  getUserProfileByEmail,
  normalizeEmail,
} from '@/lib/supabase/email-auth'
import { checkRateLimit } from '@/lib/rate-limiter'

export async function POST(req: NextRequest) {
  try {
    const { email, phone, code, newPassword } = await req.json()

    if ((!email && !phone) || !code || !newPassword) {
      return NextResponse.json({ error: 'Identifiant, code et nouveau mot de passe requis' }, { status: 400 })
    }

    // Rate limiting par email ou téléphone
    const rateLimitKey = email || phone || ''
    const { allowed } = checkRateLimit('reset-password', rateLimitKey, { maxRequests: 5, windowMs: 60_000 })
    if (!allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Veuillez réessayer dans une minute.' },
        { status: 429 }
      )
    }

    if (
      newPassword.length < 8
      || !/[A-Z]/.test(newPassword)
      || !/[a-z]/.test(newPassword)
      || !/[0-9]/.test(newPassword)
    ) {
      return NextResponse.json({
        error: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre',
      }, { status: 400 })
    }

    if (email) {
      const admin = getSupabaseAdminClient()
      const normalizedEmail = normalizeEmail(email)

      const otp = await findValidEmailOtp(admin, {
        email: normalizedEmail,
        code,
        type: 'PASSWORD_RESET',
      })

      if (!otp) {
        return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 400 })
      }

      const { error: markUsedError } = await admin
        .from('otp_codes')
        .update({ is_used: true })
        .eq('id', otp.id)

      if (markUsedError) {
        throw markUsedError
      }

      const user = await getUserProfileByEmail(admin, normalizedEmail)
      if (!user || !user.is_active) {
        return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
      }

      const { error: authError } = await admin.auth.admin.updateUserById(user.id, {
        password: newPassword,
      })

      if (authError) {
        return NextResponse.json(
          { error: authError.message || 'Impossible de mettre à jour le mot de passe Supabase' },
          { status: 400 }
        )
      }

      const { error: profileError } = await admin
        .from('users')
        .update({ password_updated_at: new Date().toISOString() })
        .eq('id', user.id)

      if (profileError) {
        throw profileError
      }

      return NextResponse.json({ message: 'Mot de passe réinitialisé avec succès' })
    }

    const supabase = getSupabaseAdminClient()

    const { data: otp } = await supabase
      .from('otp_codes')
      .select('id, user_id')
      .eq('phone', phone)
      .eq('code', code)
      .eq('type', 'PASSWORD_RESET')
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

    const { data: user } = await supabase
      .from('users')
      .select('id, is_active')
      .eq('phone', phone!)
      .maybeSingle()

    if (!user || !user.is_active) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await supabase
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', user.id)

    return NextResponse.json({ message: 'Mot de passe réinitialisé avec succès' })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
