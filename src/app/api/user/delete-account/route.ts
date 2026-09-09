import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { userId, applyCookies } = await resolveRequestUser(req)
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    if (body.confirm !== true && body.confirmation !== 'SUPPRIMER MON COMPTE') return NextResponse.json({ error: 'Confirmation requise' }, { status: 400 })

    const admin = getSupabaseAdminClient()
    const { data: profile } = await admin.from('users').select('role, active_role, is_active').eq('id', userId).maybeSingle()
    const role = profile?.active_role || profile?.role
    if (role !== 'LOCATAIRE') return NextResponse.json({ error: 'La suppression est disponible pour les comptes locataires.' }, { status: 403 })
    if (profile?.is_active === false) return applyCookies(NextResponse.json({ success: true, alreadyDeleted: true }))
    const anonymizedEmail = `deleted-${userId}@deleted.montoit.ci`
    const { error: auditError } = await admin.from('audit_logs').insert({
      id: crypto.randomUUID(),
      action: 'ACCOUNT_ANONYMIZED',
      entity: 'User',
      entity_id: userId,
      details: 'Compte désactivé et données personnelles anonymisées à la demande de l’utilisateur',
      user_id: userId,
    })
    if (auditError) throw auditError

    const cleanupResults = await Promise.all([
      admin.from('sessions').delete().eq('user_id', userId),
      admin.from('otp_codes').delete().eq('user_id', userId),
      admin.from('favorites').delete().eq('user_id', userId),
      admin.from('search_alerts').delete().eq('user_id', userId),
      admin.from('notifications').delete().eq('user_id', userId),
      admin.from('notification_preferences').delete().eq('user_id', userId),
      admin.from('connection_logs').delete().eq('user_id', userId),
      admin.from('service_usage_logs').delete().eq('user_id', userId),
      admin.from('facial_verifications').delete().eq('user_id', userId),
      admin.from('messages').update({ content: '[Message conservé après suppression du compte]' }).eq('sender_id', userId),
    ])
    const cleanupError = cleanupResults.find((result) => result.error)
    if (cleanupError?.error) throw cleanupError.error

    const { error } = await admin.from('users').update({
      email: anonymizedEmail,
      phone: null,
      first_name: 'Utilisateur',
      last_name: 'supprimé',
      avatar_url: null,
      gender: null,
      city: null,
      address: null,
      birth_date: null,
      nni: null,
      bio: null,
      company_name: null,
      is_active: false,
      is_email_verified: false,
      is_phone_verified: false,
      neoface_verified: false,
      oneci_verified: false,
      neoface_verified_at: null,
      oneci_verified_at: null,
      password_hash: null,
      password_updated_at: null,
      show_phone: false,
      show_email: false,
      two_factor_enabled: false,
      kyc_document_id: null,
      updated_at: new Date().toISOString(),
    } as any).eq('id', userId)
    if (error) throw error

    // Keep the relational user row for historical leases/audits, but revoke Auth access.
    const { error: authError } = await admin.auth.admin.updateUserById(userId, { ban_duration: '876000h', email: anonymizedEmail })
    if (authError) throw authError
    return applyCookies(NextResponse.json({ success: true }))
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json({ error: 'Impossible de supprimer le compte' }, { status: 500 })
  }
}
