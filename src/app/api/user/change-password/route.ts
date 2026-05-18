import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getUserProfileById } from '@/lib/supabase/email-auth'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/server'

/**
 * POST /api/user/change-password — Change password (requires current password)
 * Body: { currentPassword: string, newPassword: string, confirmPassword: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, authSource, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { currentPassword, newPassword, confirmPassword } = await req.json()

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 })
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'Les mots de passe ne correspondent pas' }, { status: 400 })
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

    const admin = getSupabaseAdminClient()

    if (authSource === 'supabase') {
      const profile = await getUserProfileById(admin, userId)

      if (!profile) {
        const response = NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
        return applyCookies(response)
      }

      const { supabase } = createRouteHandlerSupabaseClient(req)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: currentPassword,
      })

      if (signInError || !signInData.user) {
        const response = NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 400 })
        return applyCookies(response)
      }

      const { error: authError } = await admin.auth.admin.updateUserById(userId, {
        password: newPassword,
      })
      if (authError) {
        throw authError
      }

      const { error: profileError } = await admin
        .from('users')
        .update({ password_updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (profileError) {
        throw profileError
      }

      await admin.from('audit_logs').insert({
        action: 'PASSWORD_CHANGE',
        entity: 'User',
        entity_id: userId,
        user_id: userId,
      })

      const response = NextResponse.json({ message: 'Mot de passe mis à jour avec succès' })
      return applyCookies(response)
    }

    const { data: user } = await admin
      .from('users')
      .select('id, password_hash')
      .eq('id', userId)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!isCurrentPasswordValid) {
      return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 400 })
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12)
    await admin
      .from('users')
      .update({ password_hash: newPasswordHash, password_updated_at: new Date().toISOString() })
      .eq('id', userId)

    await admin.from('audit_logs').insert({
      action: 'PASSWORD_CHANGE',
      entity: 'User',
      entity_id: userId,
      user_id: userId,
    })

    return NextResponse.json({ message: 'Mot de passe mis à jour avec succès' })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
