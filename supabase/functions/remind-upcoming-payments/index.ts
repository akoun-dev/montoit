import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { notify } from '../_shared/notify.ts'

// J-3 and J-1 reminders for an upcoming rent due date —
// notification_preferences.payment_alerts existed but nothing ever
// triggered a reminder from it before the payment became LATE.
async function remindForOffset(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  offsetDays: number,
  reminderColumn: 'reminder_3d_sent_at' | 'reminder_1d_sent_at',
  daysLabel: string,
) {
  const now = new Date()
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays)
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays + 1)

  const { data: payments, error } = await supabase
    .from('payments')
    .update({ [reminderColumn]: now.toISOString() })
    .eq('status', 'PENDING')
    .gte('due_date', dayStart.toISOString())
    .lt('due_date', dayEnd.toISOString())
    .is(reminderColumn, null)
    .select('id, amount, due_date, tenant_id')

  if (error) {
    console.error(`Failed to claim payments for ${daysLabel} reminder:`, error)
    return { remindedCount: 0, notified: 0 }
  }

  const tenantIds = [...new Set((payments || []).map((p: any) => p.tenant_id))]
  const { data: prefs } = tenantIds.length > 0
    ? await supabase.from('notification_preferences').select('user_id, payment_alerts').in('user_id', tenantIds)
    : { data: [] as any[] }
  const prefMap = new Map((prefs || []).map((p: any) => [p.user_id, p.payment_alerts]))

  let notified = 0
  for (const payment of payments || []) {
    if (prefMap.get(payment.tenant_id) === false) continue
    const amount = payment.amount?.toLocaleString('fr-FR') || '---'
    await notify(supabase, {
      userId: payment.tenant_id,
      type: 'PAYMENT_ALERT',
      title: 'Loyer bientôt dû',
      message: `Votre loyer de ${amount} FCFA est dû ${daysLabel}. Pensez à régler à temps pour éviter un retard.`,
      actionUrl: `/dashboard/payments/${payment.id}`,
      entityId: payment.id,
    })
    notified++
  }

  return { remindedCount: (payments || []).length, notified }
}

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    const cronSecret = Deno.env.get('CRON_SECRET')
    if (cronSecret) {
      const authHeader = req.headers.get('authorization') || ''
      if (authHeader !== `Bearer ${cronSecret}`) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const supabase = getSupabaseAdminClient()

    const [j3, j1] = await Promise.all([
      remindForOffset(supabase, 3, 'reminder_3d_sent_at', 'dans 3 jours'),
      remindForOffset(supabase, 1, 'reminder_1d_sent_at', 'demain'),
    ])

    return new Response(JSON.stringify({ j3, j1 }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('remind-upcoming-payments error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
