/**
 * Edge Function unique pour la gestion des paiements Mobile Money
 * Centralise: initiation, callback, notifications, reçus
 * Documentation: https://apidist.gutouch.net/apidist/sec
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, apikey',
};

type MobileMoneyOperator = 'OM' | 'MTN' | 'MOOV' | 'WAVE';

// Service IDs pour chaque opérateur Mobile Money
const SERVICE_IDS: Record<MobileMoneyOperator, string> = {
  'OM': 'CASHINOMCIPART2',
  'MTN': 'CASHINMTNPART2',
  'MOOV': 'CASHINMOOVPART2',
  'WAVE': 'CI_CASHIN_WAVE_PART',
};

const AGENCY_CODE = 'ANSUT13287';

Deno.serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || '';

    console.log('[Payment] Action:', action, 'Method:', req.method);

    // Route vers le bon handler
    switch (action) {
      case 'initiate':
        return await handleInitiate(req);
      case 'callback':
        return await handleCallback(req);
      case 'receipt':
        return await handleReceipt(req);
      case 'notify':
        return await handleNotify(req);
      default:
        return new Response(
          JSON.stringify({
            error: 'Action invalide',
            available: ['initiate', 'callback', 'receipt', 'notify']
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('[Payment] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur serveur',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================================================
// HANDLER 1: INITIATION DE PAIEMENT
// ============================================================================
async function handleInitiate(req: Request) {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { amount, recipient_phone_number, operator, reference, otp } = await req.json();

  // Validation
  if (!amount || amount <= 0) {
    return new Response(
      JSON.stringify({ error: 'Montant invalide' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!recipient_phone_number) {
    return new Response(
      JSON.stringify({ error: 'Numéro de téléphone requis' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!operator || !SERVICE_IDS[operator as MobileMoneyOperator]) {
    return new Response(
      JSON.stringify({ error: 'Opérateur invalide (OM, MTN, MOOV, WAVE)' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // OTP optionnel (requis uniquement pour Orange Money)
  if (otp && (otp.length < 4 || otp.length > 6 || !/^\d{4,6}$/.test(otp))) {
    return new Response(
      JSON.stringify({ error: 'Code OTP invalide (4-6 chiffres)' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Configuration InTouch
  const baseUrl = Deno.env.get('INTOUCH_BASE_URL') || Deno.env.get('VITE_INTOUCH_BASE_URL') || 'https://apidist.gutouch.net/apidist/sec';
  const username = Deno.env.get('INTOUCH_USERNAME') || Deno.env.get('VITE_INTOUCH_USERNAME') || '';
  const password = Deno.env.get('INTOUCH_PASSWORD') || Deno.env.get('VITE_INTOUCH_PASSWORD') || '';
  const partnerId = Deno.env.get('INTOUCH_PARTNER_ID') || Deno.env.get('VITE_INTOUCH_PARTNER_ID') || 'CI300373';
  const loginApi = Deno.env.get('INTOUCH_LOGIN_API') || Deno.env.get('VITE_INTOUCH_LOGIN_API') || '07084598370';
  const passwordApi = Deno.env.get('INTOUCH_PASSWORD_API') || Deno.env.get('VITE_INTOUCH_PASSWORD_API') || '';

  if (!username || !password) {
    return new Response(
      JSON.stringify({ error: 'Service InTouch non configuré' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const serviceId = SERVICE_IDS[operator as MobileMoneyOperator];
  const partnerTransactionId = reference || `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const callbackUrl = `${Deno.env.get('SITE_URL') || 'https://mon-toit.ansut.ci'}/functions/v1/payment?action=callback`;

  // Payload CASHIN API
  const payload = {
    service_id: serviceId,
    recipient_phone_number: recipient_phone_number,
    amount: amount,
    partner_id: partnerId,
    partner_transaction_id: partnerTransactionId,
    login_api: loginApi,
    password_api: passwordApi,
    call_back_url: callbackUrl,
  };

  const endpoint = `${baseUrl}/${AGENCY_CODE}/cashin`;
  const auth = btoa(`${username}:${password}`);

  console.log('[Payment:Initiate] Request:', { endpoint, partnerTransactionId });

  // Appel InTouch avec timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 secondes

  let response: Response | null = null;
  let fetchError: Error | null = null;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (err) {
    clearTimeout(timeoutId);
    fetchError = err as Error;
    console.error('[Payment:Initiate] Fetch error:', fetchError);
  }

  if (fetchError) {
    if (fetchError.name === 'AbortError') {
      return new Response(
        JSON.stringify({ error: 'Timeout InTouch (30s) - Veuillez réessayer' }),
        { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    return new Response(
      JSON.stringify({ error: 'Erreur connexion InTouch', details: fetchError.message }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!response) {
    return new Response(
      JSON.stringify({ error: 'Aucune réponse reçue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const responseData = await response.json().catch(() => null);
  console.log('[Payment:Initiate] Response:', { status: response.status, data: responseData });

  // Enregistrer la transaction en base
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  await supabase.from('transactions').insert({
    transaction_id: partnerTransactionId,
    amount,
    phone_number: recipient_phone_number,
    operator,
    status: 'pending',
    type: 'rental_payment',
    description: 'Paiement Mobile Money',
  });

  // Réponse selon statut InTouch
  if (response.status === 200) {
    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: partnerTransactionId,
        status: 'SUCCESS',
        message: 'Paiement effectué',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (response.status === 201) {
    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: partnerTransactionId,
        status: 'PENDING',
        message: 'Paiement initié, en attente de validation',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      transaction_id: partnerTransactionId,
      status: 'PENDING',
      message: 'Paiement initié',
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================================================
// HANDLER 2: CALLBACK INTOUCH
// ============================================================================
async function handleCallback(req: Request) {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const callbackData = await req.json();
  console.log('[Payment:Callback] Received:', callbackData);

  const { transaction_id, status } = callbackData;

  if (!transaction_id) {
    return new Response(
      JSON.stringify({ error: 'Missing transaction_id' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Mettre à jour la transaction
  const { data: transaction } = await supabase
    .from('transactions')
    .update({
      status: status === 'SUCCESS' ? 'success' : status.toLowerCase(),
      updated_at: new Date().toISOString(),
    })
    .eq('transaction_id', transaction_id)
    .select()
    .single();

  console.log('[Payment:Callback] Transaction updated:', transaction);

  // Actions post-paiement
  if (status === 'SUCCESS' && transaction) {
    await handleSuccessfulPayment(supabase, transaction);
  }

  if (status === 'FAILED' && transaction) {
    await handleFailedPayment(supabase, transaction);
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================================================
// HANDLER 3: GÉNÉRATION REÇU
// ============================================================================
async function handleReceipt(req: Request) {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { transaction_id } = await req.json();

  if (!transaction_id) {
    return new Response(
      JSON.stringify({ error: 'transaction_id requis' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: transaction } = await supabase
    .from('transactions')
    .select('*')
    .eq('transaction_id', transaction_id)
    .single();

  if (!transaction) {
    return new Response(
      JSON.stringify({ error: 'Transaction non trouvée' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Générer le reçu (à implémenter selon vos besoins)
  const receipt = {
    receipt_id: `REC_${Date.now()}`,
    transaction_id: transaction.transaction_id,
    amount: transaction.amount,
    date: transaction.created_at,
    status: transaction.status,
  };

  return new Response(
    JSON.stringify({ success: true, receipt }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================================================
// HANDLER 4: NOTIFICATIONS
// ============================================================================
async function handleNotify(req: Request) {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { action, recipient_id, ...data } = await req.json();

  // Créer une notification
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  await supabase.from('notifications').insert({
    user_id: recipient_id,
    title: action === 'payment_received' ? 'Paiement reçu' : 'Paiement échoué',
    message: action === 'payment_received'
      ? `Paiement de ${data.amount} F reçu via ${data.payment_method}`
      : `Paiement de ${data.amount} F échoué`,
    type: 'payment',
    metadata: data,
  });

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================================================
// HELPERS
// ============================================================================
async function handleSuccessfulPayment(supabase: any, transaction: any) {
  // Enregistrer le paiement de loyer
  if (transaction.type === 'rental_payment' && transaction.lease_id) {
    await supabase.from('rent_payments').insert({
      transaction_id: transaction.transaction_id,
      lease_id: transaction.lease_id,
      amount: transaction.amount,
      payment_date: new Date().toISOString(),
      status: 'paid',
    });
  }

  // Notifier le propriétaire
  if (transaction.property_owner_id) {
    await supabase.from('notifications').insert({
      user_id: transaction.property_owner_id,
      title: 'Paiement reçu',
      message: `Paiement de ${transaction.amount} F reçu pour votre bien`,
      type: 'payment',
      metadata: { transaction_id: transaction.transaction_id },
    });
  }
}

async function handleFailedPayment(supabase: any, transaction: any) {
  // Notifier le locataire
  if (transaction.tenant_id) {
    await supabase.from('notifications').insert({
      user_id: transaction.tenant_id,
      title: 'Paiement échoué',
      message: `Votre paiement de ${transaction.amount} F a échoué`,
      type: 'payment',
      metadata: { transaction_id: transaction.transaction_id },
    });
  }
}
