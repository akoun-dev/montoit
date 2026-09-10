import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { notifyLatePayment } from '@/lib/notify'

export async function POST(req: NextRequest) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return applyCookies(NextResponse.json({ error: 'Non authentifié' }, { status: 401 }))
    }

    const supabase = getSupabaseAdminClient()

    // Réservé à l'admin et au tiers de confiance : cette route déclenche des
    // notifications de masse et duplique la tâche planifiée
    // check-overdue-payments (Edge Function, protégée par CRON_SECRET).
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()
    if (!profile || !['ADMIN', 'TIERS_CONFIANCE'].includes(profile.role)) {
      return applyCookies(NextResponse.json({ error: 'Accès refusé' }, { status: 403 }))
    }

    // Bascule atomique PENDING → LATE : seules les lignes réellement transitionnées
    // par CET appel sont retournées, ce qui évite les notifications en double si
    // cette route et la tâche planifiée s'exécutent en même temps.
    const now = new Date().toISOString()
    const { data: overduePayments, error: updateError } = await supabase
      .from('payments')
      .update({ status: 'LATE' })
      .eq('status', 'PENDING')
      .lt('due_date', now)
      .select(`
        id,
        amount,
        due_date,
        tenant_id,
        lease_id,
        lease:lease_id(
          owner_id,
          monthly_rent,
          property:property_id(title)
        )
      `)

    if (updateError) {
      console.error('[check-overdue] Update error:', updateError)
      return applyCookies(NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 }))
    }

    if (!overduePayments || overduePayments.length === 0) {
      return applyCookies(NextResponse.json({
        checked: true,
        notified: 0,
        message: 'Aucun paiement en retard détecté',
      }))
    }

    // Send notifications for each newly late payment
    let notifiedCount = 0
    const errors: string[] = []

    for (const payment of overduePayments as any[]) {
      const lease = payment.lease as any
      const ownerId = lease?.owner_id

      if (!ownerId || !payment.tenant_id) {
        console.warn('[check-overdue] Missing tenant/owner for payment:', payment.id)
        continue
      }

      try {
        await notifyLatePayment(
          payment.tenant_id,
          ownerId,
          payment.amount || lease?.monthly_rent || 0,
          payment.due_date
        )
        notifiedCount++
      } catch (notifError) {
        console.error('[check-overdue] Notification error for payment', payment.id, notifError)
        errors.push(`Échec notification paiement ${payment.id}`)
      }
    }

    return applyCookies(NextResponse.json({
      checked: true,
      notified: notifiedCount,
      totalOverdue: overduePayments.length,
      message: `${notifiedCount} notification(s) de retard envoyée(s)`,
      errors: errors.length > 0 ? errors : undefined,
    }))
  } catch (error) {
    console.error('[check-overdue] Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
