import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { notify } from '../_shared/notify.ts'

interface IntouchCallbackPayload {
  partner_transaction_id?: string
  transactionId?: string
  id?: string
  status?: string
  message?: string
  amount?: number
  recipient_phone_number?: string
  service_id?: string
  error_code?: string
  error_message?: string
  [key: string]: unknown
}

const SUCCESS_STATUSES = ['SUCCESS', 'SUCCESSFUL', 'COMPLETED', 'complete', 'success', '0']
const FAILURE_STATUSES = ['FAILED', 'FAILURE', 'REJECTED', 'CANCELLED', 'EXPIRED', 'failed', 'error', '-1', '-2']

async function handleCallback(supabase: ReturnType<typeof getSupabaseAdminClient>, payload: IntouchCallbackPayload): Promise<Response> {
  try {
    console.log('Payment callback received:', JSON.stringify(payload, null, 2))

    // Priorité : d'abord l'ID Intouch (transactionId) qu'on stocke dans operator_transaction_id,
    // puis partner_transaction_id (notre ID) qu'on stocke quand Intouch ne retourne pas de transactionId
    const lookupIds = [
      payload.transactionId,
      payload.id,
      payload.partner_transaction_id,
    ].filter(Boolean) as string[]

    if (lookupIds.length === 0) {
      console.error('Payment callback: missing transaction identifier')
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let payment: any = null
    for (const id of lookupIds) {
      const { data } = await supabase
        .from('payments')
        .select('*, lease:lease_id(owner_id)')
        .eq('operator_transaction_id', id)
        .maybeSingle()
      if (data) { payment = data; break }
    }

    if (!payment) {
      console.error('Payment callback: payment not found for transaction IDs:', lookupIds.join(', '))
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (payment.status === 'PAID' || payment.status === 'CANCELLED') {
      console.log('Payment callback: payment already in final state:', payment.status)
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const callbackStatus = String(payload.status || '').toUpperCase()
    const isSuccess =
      SUCCESS_STATUSES.includes(callbackStatus) ||
      SUCCESS_STATUSES.includes(String(payload.error_code || ''))

    const isFailure =
      FAILURE_STATUSES.includes(callbackStatus) ||
      FAILURE_STATUSES.includes(String(payload.error_code || '')) ||
      (payload.error_message && !isSuccess)

    if (isSuccess) {
      const reference =
        payload.transactionId ||
        payload.id ||
        payload.partner_transaction_id ||
        payment.operator_transaction_id ||
        ''

      await supabase
        .from('payments')
        .update({
          status: 'PAID',
          paid_at: new Date().toISOString(),
          reference: String(reference),
          payment_operator_data: payload as Record<string, unknown>,
        })
        .eq('id', payment.id)

      console.log('Payment callback: payment marked as PAID:', payment.id)

      // Notify tenant and owner
      const formattedAmount = payment.amount?.toLocaleString('fr-FR') || '---'
      await notify(supabase, {
        userId: payment.tenant_id,
        type: 'PAYMENT_ALERT',
        title: 'Paiement confirmé',
        message: `Votre paiement de ${formattedAmount} FCFA a été confirmé avec succès. Référence : ${reference}`,
        actionUrl: `/dashboard/payments/${payment.id}`,
        entityId: payment.id,
      })

      const ownerId = payment.lease?.owner_id
      if (ownerId) {
        await notify(supabase, {
          userId: ownerId,
          type: 'PAYMENT_ALERT',
          title: 'Loyer reçu',
          message: `Un paiement de ${formattedAmount} FCFA a été reçu. Référence : ${reference}`,
          actionUrl: `/dashboard/finances`,
          entityId: payment.id,
        })
      }

      // Auto-generate next month's payment (skip deposit/advance)
      const isInitialPayment = payment.reference?.startsWith('CAUTION-') || payment.reference?.startsWith('AVANCE-')
      if (!isInitialPayment && payment.lease_id) {
        const nextDue = new Date(payment.due_date)
        nextDue.setMonth(nextDue.getMonth() + 1)

        // Check no existing payment for this period
        const { data: existing } = await supabase
          .from('payments')
          .select('id')
          .eq('lease_id', payment.lease_id)
          .eq('due_date', nextDue.toISOString())
          .in('status', ['PENDING', 'PROCESSING'])
          .maybeSingle()

        if (!existing && payment.amount) {
          await supabase.from('payments').insert({
            id: crypto.randomUUID(),
            lease_id: payment.lease_id,
            tenant_id: payment.tenant_id,
            amount: payment.amount,
            status: 'PENDING',
            due_date: nextDue.toISOString(),
          })
          console.log('Payment callback: auto-generated next month payment for lease:', payment.lease_id)
        }
      }
    } else if (isFailure) {
      const failureReason = payload.error_message || payload.message || callbackStatus

      await supabase
        .from('payments')
        .update({
          status: 'PENDING',
          method: null,
          operator_transaction_id: null,
          payment_operator_data: payload as Record<string, unknown>,
        })
        .eq('id', payment.id)

      console.log('Payment callback: payment reverted to PENDING:', payment.id, 'Reason:', failureReason)

      // Notify tenant
      const formattedAmount = payment.amount?.toLocaleString('fr-FR') || '---'
      await notify(supabase, {
        userId: payment.tenant_id,
        type: 'PAYMENT_ALERT',
        title: 'Paiement échoué',
        message: `Votre paiement de ${formattedAmount} FCFA a échoué. Motif : ${failureReason}. Veuillez réessayer.`,
        actionUrl: `/dashboard/payments/${payment.id}`,
        entityId: payment.id,
      })
    } else {
      await supabase
        .from('payments')
        .update({
          payment_operator_data: payload as Record<string, unknown>,
        })
        .eq('id', payment.id)

      console.log('Payment callback: unknown status received:', callbackStatus, 'for payment:', payment.id)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Payment callback handler error:', err)
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  const supabase = getSupabaseAdminClient()

  // ── Callback secret verification ──
  const callbackSecret = Deno.env.get('INTOUCH_CALLBACK_SECRET')
  if (callbackSecret) {
    const url = new URL(req.url)
    const token = url.searchParams.get('token')
    if (token !== callbackSecret) {
      console.error('Payment callback: invalid or missing callback secret')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  if (req.method === 'POST') {
    const payload: IntouchCallbackPayload | null = await req.json().catch(() => null)
    if (!payload) {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    return handleCallback(supabase, payload)
  }

  if (req.method === 'GET') {
    const { searchParams } = new URL(req.url)
    const payload: IntouchCallbackPayload = {
      partner_transaction_id: searchParams.get('partner_transaction_id') || undefined,
      status: searchParams.get('status') || undefined,
      transactionId: searchParams.get('transactionId') || undefined,
      message: searchParams.get('message') || undefined,
      error_code: searchParams.get('error_code') || undefined,
      error_message: searchParams.get('error_message') || undefined,
    }
    return handleCallback(supabase, payload)
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
