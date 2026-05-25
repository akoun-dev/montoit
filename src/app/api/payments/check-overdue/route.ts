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

    // Find all PENDING payments past their due date
    const now = new Date().toISOString()
    const { data: overduePayments, error: fetchError } = await supabase
      .from('payments')
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
      .eq('status', 'PENDING')
      .lt('due_date', now)

    if (fetchError) {
      console.error('[check-overdue] Fetch error:', fetchError)
      return applyCookies(NextResponse.json({ error: 'Erreur lors de la vérification' }, { status: 500 }))
    }

    if (!overduePayments || overduePayments.length === 0) {
      return applyCookies(NextResponse.json({
        checked: true,
        notified: 0,
        message: 'Aucun paiement en retard détecté',
      }))
    }

    // Update all matching payments to LATE status
    const overdueIds = overduePayments.map((p: any) => p.id)
    const { error: updateError } = await supabase
      .from('payments')
      .update({ status: 'LATE' })
      .in('id', overdueIds)

    if (updateError) {
      console.error('[check-overdue] Update error:', updateError)
      return applyCookies(NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 }))
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
