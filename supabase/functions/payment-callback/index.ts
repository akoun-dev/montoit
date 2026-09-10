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

    // Find the specific attempt this callback refers to — payment.amount is
    // the TOTAL due, not necessarily this attempt's amount, since a partial
    // payment can be settled over several attempts. Also doubles as the
    // idempotency guard: an attempt already resolved means this callback
    // was already processed (retry/duplicate webhook).
    let attempt: any = null
    for (const id of lookupIds) {
      const { data } = await supabase
        .from('payment_attempts')
        .select('*')
        .eq('operator_transaction_id', id)
        .eq('payment_id', payment.id)
        .maybeSingle()
      if (data) { attempt = data; break }
    }

    if (attempt && attempt.status !== 'PROCESSING') {
      console.log('Payment callback: attempt already processed:', attempt.id, attempt.status)
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const attemptAmount = attempt?.amount ?? Math.max(payment.amount - (payment.amount_paid || 0), 0)

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

      const newAmountPaidRaw = (payment.amount_paid || 0) + attemptAmount
      const isFullyPaid = newAmountPaidRaw >= payment.amount - 0.01
      const newAmountPaid = isFullyPaid ? payment.amount : newAmountPaidRaw
      const finalStatus = isFullyPaid ? 'PAID' : 'PARTIAL'

      // Conditional update (compare-and-swap on status) so that two
      // concurrent/retried callbacks for the same payment can't both "win"
      // and both fire notifications + auto-generate the next period twice.
      const { data: claimed } = await supabase
        .from('payments')
        .update({
          status: finalStatus,
          amount_paid: newAmountPaid,
          ...(isFullyPaid ? { paid_at: new Date().toISOString() } : {}),
          reference: String(reference),
          payment_operator_data: payload as Record<string, unknown>,
        })
        .eq('id', payment.id)
        .not('status', 'in', '("PAID","CANCELLED")')
        .select('id')
        .maybeSingle()

      if (!claimed) {
        console.log('Payment callback: payment already claimed by a concurrent callback:', payment.id)
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (attempt) {
        await supabase.from('payment_attempts').update({ status: 'SUCCESS', completed_at: new Date().toISOString() }).eq('id', attempt.id)
      }

      console.log(`Payment callback: payment marked as ${finalStatus}:`, payment.id)

      // Notify tenant and owner
      const formattedAttemptAmount = attemptAmount.toLocaleString('fr-FR')
      const remainingAfter = payment.amount - newAmountPaid
      const partialSuffix = isFullyPaid ? '' : ` Il reste ${remainingAfter.toLocaleString('fr-FR')} FCFA à régler.`
      await notify(supabase, {
        userId: payment.tenant_id,
        type: 'PAYMENT_ALERT',
        title: isFullyPaid ? 'Paiement confirmé' : 'Paiement partiel confirmé',
        message: `Votre paiement de ${formattedAttemptAmount} FCFA a été confirmé avec succès. Référence : ${reference}.${partialSuffix}`,
        actionUrl: `/dashboard/payments/${payment.id}`,
        entityId: payment.id,
      })

      const ownerId = payment.lease?.owner_id
      if (ownerId) {
        await notify(supabase, {
          userId: ownerId,
          type: 'PAYMENT_ALERT',
          title: isFullyPaid ? 'Loyer reçu' : 'Paiement partiel reçu',
          message: `Un paiement de ${formattedAttemptAmount} FCFA a été reçu. Référence : ${reference}.${partialSuffix}`,
          actionUrl: `/dashboard/finances`,
          entityId: payment.id,
        })
      }

      // Auto-generate next month's payment (skip deposit/advance/agency fee rows,
      // and skip until this payment is fully settled).
      // Relies on the partial unique index on payments(lease_id, due_date)
      // WHERE reference IS NULL to stay correct under concurrent/retried
      // callbacks — a 23505 conflict here just means another callback (or a
      // retry) already created this period's payment, which is the desired
      // outcome, so it's swallowed rather than surfaced as an error.
      const isInitialPayment = payment.reference?.startsWith('CAUTION-') || payment.reference?.startsWith('AVANCE-')
      if (isFullyPaid && !isInitialPayment && payment.lease_id && payment.amount) {
        const nextDue = new Date(payment.due_date)
        nextDue.setMonth(nextDue.getMonth() + 1)

        const { error: nextPaymentError } = await supabase.from('payments').insert({
          id: crypto.randomUUID(),
          lease_id: payment.lease_id,
          tenant_id: payment.tenant_id,
          amount: payment.amount,
          status: 'PENDING',
          due_date: nextDue.toISOString(),
        })

        if (nextPaymentError) {
          if (nextPaymentError.code === '23505') {
            console.log('Payment callback: next month payment already exists for lease:', payment.lease_id)
          } else {
            console.error('Payment callback: failed to auto-generate next month payment:', nextPaymentError)
          }
        } else {
          console.log('Payment callback: auto-generated next month payment for lease:', payment.lease_id)
        }
      }
    } else if (isFailure) {
      const failureReason = payload.error_message || payload.message || callbackStatus
      const revertStatus = (payment.amount_paid || 0) > 0 ? 'PARTIAL' : 'PENDING'

      await supabase
        .from('payments')
        .update({
          status: revertStatus,
          method: null,
          operator_transaction_id: null,
          payment_operator_data: payload as Record<string, unknown>,
        })
        .eq('id', payment.id)

      if (attempt) {
        await supabase.from('payment_attempts').update({ status: 'FAILED', failure_reason: String(failureReason), completed_at: new Date().toISOString() }).eq('id', attempt.id)
      }

      console.log('Payment callback: payment reverted to', revertStatus, ':', payment.id, 'Reason:', failureReason)

      // Notify tenant
      const formattedAmount = attemptAmount.toLocaleString('fr-FR')
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
