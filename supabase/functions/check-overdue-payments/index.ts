import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { notify } from '../_shared/notify.ts'

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Protect with CRON_SECRET
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

    // Atomic PENDING → LATE transition: only rows this call actually flips
    // are returned, so a concurrent run of this same function (or of the
    // /api/payments/check-overdue route) can never notify twice for the
    // same payment.
    const { data: overdue, error: updateError } = await supabase
      .from('payments')
      .update({ status: 'LATE', updated_at: new Date().toISOString() })
      .eq('status', 'PENDING')
      .lt('due_date', new Date().toISOString())
      .select('id, amount, due_date, tenant_id, lease:lease_id(owner_id)')

    if (updateError) {
      console.error('Failed to update overdue payments:', updateError)
      return new Response(JSON.stringify({ error: 'Update failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const ids = (overdue || []).map((p: any) => p.id)
    if (ids.length === 0) {
      return new Response(JSON.stringify({ notified: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Send notifications
    for (const payment of overdue || []) {
      const ownerId = (payment.lease as any)?.owner_id
      const amount = payment.amount?.toLocaleString('fr-FR') || '---'
      const dueDate = new Date(payment.due_date).toLocaleDateString('fr-FR')

      await notify(supabase, {
        userId: payment.tenant_id,
        type: 'PAYMENT_ALERT',
        title: 'Paiement en retard',
        message: `Votre loyer de ${amount} FCFA dû le ${dueDate} est maintenant en retard. Veuillez procéder au paiement dès que possible.`,
        actionUrl: `/dashboard/payments/${payment.id}`,
        entityId: payment.id,
      })

      if (ownerId) {
        await notify(supabase, {
          userId: ownerId,
          type: 'PAYMENT_ALERT',
          title: 'Loyer en retard',
          message: `Le loyer de ${amount} FCFA dû le ${dueDate} est en retard.`,
          actionUrl: `/dashboard/finances`,
          entityId: payment.id,
        })
      }
    }

    return new Response(JSON.stringify({ notified: ids.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('check-overdue-payments error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
