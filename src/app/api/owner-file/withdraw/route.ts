import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notifyMany } from '@/lib/notify'

function generateId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * POST /api/owner-file/withdraw
 *
 * Permet au propriétaire de retirer explicitement son dossier soumis (statut
 * SUBMITTED) pour pouvoir le modifier à nouveau. Le statut repasse en DRAFT
 * et les TC actifs sont notifiés du retrait.
 *
 * Refusé si le dossier est en TC_REVIEW (le TC a déjà commencé à examiner
 * et a demandé un complément — l'owner doit y répondre, pas tout retirer)
 * ou VALIDATED (terminé).
 */
export async function POST(req: NextRequest) {
  const { userId, applyCookies } = await resolveRequestUser(req)
  try {
    if (!userId) {
      const resp = NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      return applyCookies(resp)
    }

    const admin = getSupabaseAdminClient()

    const { data: ownerFile, error: fetchError } = await admin
      .from('owner_files')
      .select('id, status, owner_id')
      .eq('owner_id', userId)
      .eq('status', 'SUBMITTED')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError) {
      console.error('[Withdraw] Fetch error:', fetchError)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    if (!ownerFile) {
      return NextResponse.json(
        { error: 'Aucun dossier en attente de validation à retirer.' },
        { status: 404 }
      )
    }

    const { error: updateError } = await admin
      .from('owner_files')
      .update({ status: 'DRAFT', reviewed_by_id: null, reviewed_at: null })
      .eq('id', ownerFile.id)

    if (updateError) {
      console.error('[Withdraw] Update error:', updateError)
      return NextResponse.json({ error: 'Impossible de retirer le dossier' }, { status: 500 })
    }

    await admin.from('audit_logs').insert({
      id: generateId(),
      action: 'WITHDRAW',
      entity: 'OwnerFile',
      entity_id: ownerFile.id,
      details: 'Le propriétaire a retiré sa soumission pour modification',
      user_id: userId,
    })

    // Notifier les TC actifs que le dossier est retiré de leur file
    try {
      const { data: tcUsers } = await admin
        .from('users')
        .select('id')
        .eq('role', 'TIERS_CONFIANCE')
        .eq('is_active', true)

      if (tcUsers && tcUsers.length > 0) {
        await notifyMany({
          userIds: tcUsers.map((tc: any) => tc.id),
          type: 'DOSSIER_UPDATE',
          title: 'Dossier propriétaire retiré',
          message: 'Un dossier propriétaire en attente a été retiré par son propriétaire pour modification.',
          actionUrl: 'owner-dossiers',
          entityId: ownerFile.id,
        })
      }
    } catch (notifyErr) {
      console.error('[Withdraw] Notify TC failed:', notifyErr)
    }

    const resp = NextResponse.json({ withdrawn: true, fileId: ownerFile.id, status: 'DRAFT' })
    return applyCookies(resp)
  } catch (error) {
    console.error('[Withdraw] Error:', error)
    const resp = NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return applyCookies ? applyCookies(resp) : resp
  }
}
