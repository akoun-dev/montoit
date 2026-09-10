import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { resolveUserFromRequest } from '../_shared/auth.ts'
import { notify } from '../_shared/notify.ts'
import {
  generatePartnerTransactionId,
  getDefaultCallbackUrl,
  getDefaultWaveCancelUrl,
  getDefaultWaveReturnUrl,
  getOperatorLabel,
  initiatePaiement,
  type PaymentOperator,
} from '../_shared/intouch.ts'

interface InitiatePaymentBody {
  paymentId: string
  method: PaymentOperator
  phoneNumber?: string
  amount?: number
}

const VALID_METHODS: PaymentOperator[] = ['ORANGE_MONEY', 'MTN_MOMO', 'MOOV_MONEY', 'WAVE']
const PHONE_REGEX = /^(?:\+225|0)?\d{8,10}$/

function extractRedirectUrl(operatorData: Record<string, unknown> | null | undefined): string | null {
  if (!operatorData) return null

  const candidateKeys = [
    'waveLaunchUrl',
    'wave_launch_url',
    'redirectUrl',
    'redirect_url',
    'paymentUrl',
    'payment_url',
    'url',
    'link',
  ] as const

  for (const key of candidateKeys) {
    const value = operatorData[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value
    }
  }

  return null
}

serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = await resolveUserFromRequest(req)
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = getSupabaseAdminClient()

    const { data: profile } = await supabase
      .from('users')
      .select('active_role, phone, first_name, last_name, email')
      .eq('id', userId)
      .single()

    const body: InitiatePaymentBody = await req.json()
    const { paymentId, method, phoneNumber, amount: requestedAmount } = body

    if (!paymentId || !method) {
      return new Response(JSON.stringify({ error: 'Champs requis manquants: paymentId, method' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const effectiveRole = profile?.active_role
    if (effectiveRole !== 'LOCATAIRE') {
      // Vérifier si l'utilisateur est bien le locataire du paiement (cas même personne propriétaire=locataire)
      const { data: roleCheck } = await supabase
        .from('payments')
        .select('tenant_id')
        .eq('id', paymentId)
        .maybeSingle()

      if (!roleCheck || roleCheck.tenant_id !== userId) {
        return new Response(JSON.stringify({ error: 'Seuls les locataires peuvent initier un paiement' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const rawPhone = phoneNumber || profile?.phone
    if (!rawPhone) {
      return new Response(JSON.stringify({ error: 'Aucun numéro de téléphone trouvé. Veuillez fournir un numéro ou enregistrer celui de votre profil.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const cleanedPhone = rawPhone.replace(/\s/g, '')
    if (!PHONE_REGEX.test(cleanedPhone)) {
      return new Response(JSON.stringify({ error: 'Numéro de téléphone invalide' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!VALID_METHODS.includes(method)) {
      return new Response(JSON.stringify({ error: `Méthode de paiement invalide. Méthodes acceptées: ${VALID_METHODS.join(', ')}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, amount, amount_paid, status')
      .eq('id', paymentId)
      .eq('tenant_id', userId)
      .maybeSingle()

    if (paymentError || !payment) {
      return new Response(JSON.stringify({ error: 'Paiement introuvable' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!['PENDING', 'LATE', 'PARTIAL'].includes(payment.status)) {
      return new Response(JSON.stringify({ error: `Ce paiement ne peut pas être initié. Statut actuel: ${payment.status}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const remaining = payment.amount - (payment.amount_paid || 0)
    const attemptAmount = requestedAmount ?? remaining
    if (!(attemptAmount > 0) || attemptAmount > remaining + 0.01) {
      return new Response(JSON.stringify({ error: `Montant invalide. Il reste ${remaining.toLocaleString('fr-FR')} FCFA à payer.` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const partnerTransactionId = generatePartnerTransactionId()

    const tenantPhone = cleanedPhone.startsWith('+225') ? cleanedPhone.slice(4) : cleanedPhone
    const callbackUrl = getDefaultCallbackUrl()
    const waveReturnUrl = getDefaultWaveReturnUrl()
    const waveCancelUrl = getDefaultWaveCancelUrl()

    const paiementResult = await initiatePaiement({
      operator: method,
      recipientNumber: tenantPhone,
      amount: attemptAmount,
      idFromClient: partnerTransactionId,
      recipientEmail: profile?.email || '',
      recipientFirstName: profile?.first_name || '',
      recipientLastName: profile?.last_name || '',
      destinataire: tenantPhone,
      callback: callbackUrl,
      ...(method === 'WAVE' ? {
        partnerName: 'Mon Toit',
        returnUrl: waveReturnUrl,
        cancelUrl: waveCancelUrl,
      } : {}),
    })

    if (!paiementResult.success) {
      return new Response(JSON.stringify({ error: "Échec de l'initiation du paiement", details: paiementResult.error }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const operatorData = paiementResult.data || paiementResult.raw
    const operatorRaw = paiementResult.data as Record<string, unknown> | null
    const operatorTransactionId =
      (operatorRaw?.transactionId as string) ||
      (operatorRaw?.id as string) ||
      partnerTransactionId
    const redirectUrl = extractRedirectUrl(operatorRaw)

    const { data: updatedPayment } = await supabase
      .from('payments')
      .update({
        status: 'PROCESSING',
        method,
        operator_transaction_id: operatorTransactionId,
        operator_phone_number: cleanedPhone,
        payment_operator_data: operatorData as Record<string, unknown>,
      })
      .eq('id', paymentId)
      .select()
      .single()

    await supabase.from('payment_attempts').insert({
      id: crypto.randomUUID(),
      payment_id: paymentId,
      amount: attemptAmount,
      method,
      operator_transaction_id: operatorTransactionId,
      partner_transaction_id: partnerTransactionId,
      status: 'PROCESSING',
    })

    const methodLabel = getOperatorLabel(method)

    // Notify tenant that payment is processing
    const formattedAmount = attemptAmount.toLocaleString('fr-FR')
    await notify(supabase, {
      userId: userId,
      type: 'PAYMENT_ALERT',
      title: 'Paiement en cours',
      message: `Votre paiement de ${formattedAmount} FCFA via ${methodLabel} est en cours de traitement.`,
      actionUrl: `/dashboard/payments/${paymentId}`,
      entityId: paymentId,
    })

    return new Response(JSON.stringify({
      data: {
        paymentId: updatedPayment.id,
        status: updatedPayment.status,
        method: updatedPayment.method,
        partnerTransactionId,
        operatorTransactionId,
        amount: attemptAmount,
        remainingBeforePayment: remaining,
        operator: methodLabel,
        redirectUrl,
        message: 'Paiement initié avec succès. Vous recevrez une notification sur votre téléphone.',
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Payment initiate error:', err)
    return new Response(JSON.stringify({ error: "Erreur serveur lors de l'initiation du paiement" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
