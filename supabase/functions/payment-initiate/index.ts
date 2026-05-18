import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { initiateCashin, generatePartnerTransactionId, getOperatorLabel, type PaymentOperator } from '../_shared/intouch.ts'

interface InitiatePaymentBody {
  paymentId: string
  method: PaymentOperator
  phoneNumber: string
}

const VALID_METHODS: PaymentOperator[] = ['ORANGE_MONEY', 'MTN_MOMO', 'MOOV_MONEY', 'WAVE']
const PHONE_REGEX = /^(?:\+225|0)?\d{8,10}$/

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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = getSupabaseAdminClient()
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('active_role')
      .eq('id', user.id)
      .single()

    const effectiveRole = profile?.active_role
    if (effectiveRole !== 'LOCATAIRE') {
      return new Response(JSON.stringify({ error: 'Seuls les locataires peuvent initier un paiement' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body: InitiatePaymentBody = await req.json()
    const { paymentId, method, phoneNumber } = body

    if (!paymentId || !method || !phoneNumber) {
      return new Response(JSON.stringify({ error: 'Champs requis manquants: paymentId, method, phoneNumber' }), {
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

    const cleanedPhone = phoneNumber.replace(/\s/g, '')
    if (!PHONE_REGEX.test(cleanedPhone)) {
      return new Response(JSON.stringify({ error: 'Numéro de téléphone invalide' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, lease:lease_id(id, owner_id, owner:owner_id(id, first_name, last_name, phone))')
      .eq('id', paymentId)
      .eq('tenant_id', user.id)
      .maybeSingle()

    if (paymentError || !payment) {
      return new Response(JSON.stringify({ error: 'Paiement introuvable' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (payment.status !== 'PENDING') {
      return new Response(JSON.stringify({ error: `Ce paiement ne peut pas être initié. Statut actuel: ${payment.status}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const owner = payment.lease?.owner
    const recipientPhone = owner?.phone

    if (!recipientPhone) {
      return new Response(JSON.stringify({ error: "Le propriétaire n'a pas de numéro de téléphone enregistré pour recevoir le paiement" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const partnerTransactionId = generatePartnerTransactionId()

    const cashinResult = await initiateCashin({
      operator: method,
      recipientPhoneNumber: recipientPhone,
      amount: payment.amount,
      partnerTransactionId,
    })

    if (!cashinResult.success) {
      return new Response(JSON.stringify({ error: "Échec de l'initiation du paiement", details: cashinResult.error }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const operatorData = cashinResult.data || cashinResult.raw
    const operatorRaw = cashinResult.data as Record<string, unknown> | null
    const operatorTransactionId =
      (operatorRaw?.transactionId as string) ||
      (operatorRaw?.id as string) ||
      partnerTransactionId

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

    const methodLabel = getOperatorLabel(method)

    return new Response(JSON.stringify({
      data: {
        paymentId: updatedPayment.id,
        status: updatedPayment.status,
        method: updatedPayment.method,
        partnerTransactionId,
        operatorTransactionId,
        amount: updatedPayment.amount,
        operator: methodLabel,
        message: 'Paiement initié avec succès. Vous recevrez une confirmation sous peu.',
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
