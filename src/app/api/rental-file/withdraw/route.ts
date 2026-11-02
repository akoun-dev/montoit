import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notifyMany } from '@/lib/notify'

function generateId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * POST /api/rental-file/withdraw
 *
 * Permet au locataire de retirer explicitement son dossier soumis (statut
 * SUBMITTED) pour pouvoir le modifier à nouveau. Le statut repasse en DRAFT
 * et les TC actifs sont notifiés du retrait.
 *
 * FUN-002 (dossiers multiples) : le body peut contenir `rentalFileId` pour
 * cibler un dossier précis (ex. retirer la soumission COLOCATION quand un
 * autre dossier STANDARD est aussi en attente). Sans `rentalFileId`, on
 * conserve le comportement historique : le dossier SUBMITTED le plus récent.
 *
 * Refusé si le dossier est en TC_REVIEW (le TC a déjà commencé à examiner
 * et a demandé un complément — le locataire doit y répondre, pas tout retirer)
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

    // FUN-002 : ciblage optionnel d'un dossier précis (ownership vérifié)
    let targetFileId: string | null = null
    try {
      const body = await req.json()
      const { rentalFileId } = (body ?? {}) as { rentalFileId?: string }
      if (rentalFileId && typeof rentalFileId === 'string') {
        const { data: target } = await admin
          .from('rental_files')
          .select('id, tenant_id, status')
          .eq('id', rentalFileId)
          .maybeSingle()
        if (target && target.tenant_id === userId) {
          targetFileId = target.id
        } else {
          const resp = NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
          return applyCookies(resp)
        }
      }
    } catch {
      // Body absent ou non JSON → comportement historique (dossier le plus récent)
    }

    let query = admin
      .from('rental_files')
      .select('id, status, tenant_id')
      .eq('tenant_id', userId)
      .eq('status', 'SUBMITTED')
      .order('updated_at', { ascending: false })
      .limit(1)

    if (targetFileId) {
      query = admin
        .from('rental_files')
        .select('id, status, tenant_id')
        .eq('id', targetFileId)
        .eq('tenant_id', userId)
        .eq('status', 'SUBMITTED')
        .limit(1)
    }

    const { data: rentalFile, error: fetchError } = await query.maybeSingle()

    if (fetchError) {
      console.error('[Rental Withdraw] Fetch error:', fetchError)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    if (!rentalFile) {
      return NextResponse.json(
        { error: 'Aucun dossier en attente de validation à retirer.' },
        { status: 404 }
      )
    }

    const { error: updateError } = await admin
      .from('rental_files')
      .update({ status: 'DRAFT', reviewed_by_id: null, reviewed_at: null })
      .eq('id', rentalFile.id)

    if (updateError) {
      console.error('[Rental Withdraw] Update error:', updateError)
      return NextResponse.json({ error: 'Impossible de retirer le dossier' }, { status: 500 })
    }

    await admin.from('audit_logs').insert({
      id: generateId(),
      action: 'WITHDRAW',
      entity: 'RentalFile',
      entity_id: rentalFile.id,
      details: 'Le locataire a retiré sa soumission pour modification',
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
          title: 'Dossier locataire retiré',
          message: 'Un dossier locataire en attente a été retiré par son propriétaire pour modification.',
          actionUrl: 'dossier-validations',
          entityId: rentalFile.id,
        })
      }
    } catch (notifyErr) {
      console.error('[Rental Withdraw] Notify TC failed:', notifyErr)
    }

    const resp = NextResponse.json({ withdrawn: true, fileId: rentalFile.id, status: 'DRAFT' })
    return applyCookies(resp)
  } catch (error) {
    console.error('[Rental Withdraw] Error:', error)
    const resp = NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return applyCookies ? applyCookies(resp) : resp
  }
}
