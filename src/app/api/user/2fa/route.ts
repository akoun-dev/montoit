import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'

async function verify2faCode(userId: string, code: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient()
  const { data } = await supabase
    .from('two_factor_codes')
    .select('id')
    .eq('user_id', userId)
    .eq('code', code)
    .eq('is_used', false)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  return !!data
}

export async function POST(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const { enable, code } = await req.json()

    if (typeof enable !== 'boolean') {
      return NextResponse.json({ error: 'Le paramètre "enable" est requis (booléen)' }, { status: 400 })
    }

    if (enable) {
      const { data: user } = await ((supabase as any)
        .from('users')
        .select('email, is_email_verified, two_factor_enabled')
        .eq('id', userId)
        .single() as any)

      if (!user) {
        return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
      }

      if (!user.is_email_verified) {
        return NextResponse.json({ error: 'Vous devez vérifier votre email avant d\'activer la 2FA' }, { status: 400 })
      }

      if (user.two_factor_enabled) {
        return NextResponse.json({ error: 'La 2FA est déjà activée' }, { status: 400 })
      }

      await (supabase.from('users') as any).update({ two_factor_enabled: true }).eq('id', userId)

      await (supabase.from('audit_logs') as any).insert({
        action: '2FA_ENABLED',
        entity: 'User',
        entity_id: userId,
        user_id: userId,
      })

      const resp = NextResponse.json({ message: 'Authentification à deux facteurs activée', enabled: true })
      return applyCookies(resp)
    }

    const { data: user } = await ((supabase as any)
      .from('users')
      .select('two_factor_enabled')
      .eq('id', userId)
      .single() as any)

    if (!user?.two_factor_enabled) {
      return NextResponse.json({ error: 'La 2FA n\'est pas activée' }, { status: 400 })
    }

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code 2FA requis pour désactiver l\'authentification à deux facteurs' }, { status: 400 })
    }

    const isValid = await verify2faCode(userId, code)
    if (!isValid) {
      return NextResponse.json({ error: 'Code 2FA invalide ou expiré' }, { status: 400 })
    }

    await (supabase.from('two_factor_codes') as any)
      .update({ is_used: true })
      .eq('user_id', userId)
      .eq('code', code)

    await (supabase.from('users') as any).update({ two_factor_enabled: false }).eq('id', userId)

    await (supabase.from('audit_logs') as any).insert({
      action: '2FA_DISABLED',
      entity: 'User',
      entity_id: userId,
      user_id: userId,
    })

    const resp = NextResponse.json({ message: 'Authentification à deux facteurs désactivée', enabled: false })
    return applyCookies(resp)
  } catch (error) {
    console.error('2FA POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
