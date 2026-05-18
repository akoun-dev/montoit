import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notify } from '@/lib/notify'

// POST /api/profile/share — Share profile with another user via email
export async function POST(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const supabase = getSupabaseAdminClient()

    const body = await req.json()
    const { email } = body

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Adresse email invalide' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, first_name, last_name, role, active_role, email')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    if (normalizedEmail === user.email?.toLowerCase()) {
      return NextResponse.json({ error: 'Vous ne pouvez pas partager votre profil avec vous-même' }, { status: 400 })
    }

    const { data: targetUser } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('email', normalizedEmail)
      .maybeSingle()

    const effectiveRole = user.active_role || user.role
    const roleLabel = effectiveRole === 'PROPRIETAIRE' ? 'propriétaire' : effectiveRole === 'LOCATAIRE' ? 'locataire' : effectiveRole.toLowerCase()

    if (targetUser) {
      await notify({
        userId: targetUser.id,
        type: 'SYSTEM',
        title: 'Profil partagé',
        message: `${user.first_name} ${user.last_name} a partagé son profil ${roleLabel} avec vous.`,
        actionUrl: 'settings',
      })
    }

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'PROFILE_SHARE',
      entity: 'USER',
      entity_id: user.id,
      details: `Profil ${roleLabel} partagé avec ${normalizedEmail}`,
    })

    const profileLink = `/profil/${user.id}`

    const response = NextResponse.json({
      success: true,
      message: targetUser
        ? `Lien de partage envoyé à ${targetUser.first_name} ${targetUser.last_name}`
        : `Lien de partage envoyé à ${normalizedEmail}`,
      profileLink,
      targetFound: !!targetUser,
    })
    return applyCookies(response)
  } catch (error) {
    console.error('Profile share error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
