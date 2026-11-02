/**
 * Edge Function pour initier un paiement Mobile Money via InTouch
 * Documentation: https://developers.intouchgroup.net/documentation/TRANSFER/1
 * Contourne le problème CORS en servant de proxy
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, apikey',
};

type MobileMoneyOperator = 'OM' | 'MTN' | 'MOOV' | 'WAVE';

interface PaymentRequest {
  amount: number;
  recipient_phone_number: string;
  operator: MobileMoneyOperator;
  reference?: string;
}

// Service IDs pour chaque opérateur Mobile Money (fournis par InTouch)
const SERVICE_IDS: Record<MobileMoneyOperator, string> = {
  'OM': 'CASHINOMCIPART2',
  'MTN': 'CASHINMTNPART2',
  'MOOV': 'CASHINMOOVPART2',
  'WAVE': 'CI_CASHIN_WAVE_PART',
};

// Agency code InTouch
const AGENCY_CODE = 'ANSUT13287';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { amount, recipient_phone_number, operator, reference }: PaymentRequest = await req.json();

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

    // Configuration InTouch depuis les variables d'environnement
    const baseUrl = Deno.env.get('VITE_INTOUCH_BASE_URL') || Deno.env.get('VITE_INTOUCH_API_URL') || 'https://apidist.gutouch.net/apidist/sec';
    const username = Deno.env.get('VITE_INTOUCH_USERNAME') || '';
    const password = Deno.env.get('VITE_INTOUCH_PASSWORD') || '';
    const partnerId = Deno.env.get('VITE_INTOUCH_PARTNER_ID') || 'CI300373';
    const loginApi = Deno.env.get('VITE_INTOUCH_LOGIN_API') || '07084598370';
    const passwordApi = Deno.env.get('VITE_INTOUCH_PASSWORD_API') || '';

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: 'Service InTouch non configuré' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceId = SERVICE_IDS[operator as MobileMoneyOperator];
    const partnerTransactionId = reference || `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // URL de callback pour les notifications de transaction
    const callbackUrl = `${Deno.env.get('SITE_URL') || 'https://montoit.ansut.ci'}/api/payment-callback`;

    // Payload selon la documentation officielle InTouch
    const payload = {
      service_id: serviceId,
      recipient_phone_number: recipient_phone_number,
      amount: amount.toString(),
      partner_id: partnerId,
      partner_transaction_id: partnerTransactionId,
      login_api: loginApi,
      password_api: passwordApi,
      call_back_url: callbackUrl,
    };

    // Endpoint selon la documentation: /{agency_code}/cashin
    const endpoint = `${baseUrl}/${AGENCY_CODE}/cashin`;

    console.log('[initiate-payment] Request:', { endpoint, operator, partnerTransactionId, payload });

    // Encoder les identifiants en Base64 pour Basic Auth
    const auth = btoa(`${username}:${password}`);
    console.log('[initiate-payment] Auth header (first 10 chars):', auth.substring(0, 10) + '...');

    // Créer un timeout de 15 secondes pour l'appel InTouch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    // Effectuer la requête vers InTouch
    console.log('[initiate-payment] Sending request to InTouch...');
    let response: Response;
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
      console.error('[initiate-payment] Fetch error:', fetchError);
    }

    if (fetchError) {
      if (fetchError.name === 'AbortError') {
        return new Response(
          JSON.stringify({
            error: 'L\'API InTouch ne répond pas (timeout 15s)',
            details: 'Vérifiez que l\'endpoint est accessible et que les identifiants sont corrects',
          }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({
          error: 'Erreur de connexion à l\'API InTouch',
          details: fetchError.message,
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[initiate-payment] InTouch response status:', response.status, response.statusText);

    const responseData = await response.json().catch(() => null);
    const responseText = await response.clone().text();

    console.log('[initiate-payment] InTouch response:', {
      status: response.status,
      statusText: response.statusText,
      data: responseData,
      text: responseText,
    });

    // Gestion des réponses selon la documentation InTouch
    if (response.status === 200) {
      // Successful and closed transaction
      return new Response(
        JSON.stringify({
          success: true,
          transaction_id: partnerTransactionId,
          status: responseData?.status || 'SUCCESS',
          message: responseData?.message || 'Paiement effectué avec succès',
          data: responseData,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (response.status === 201) {
      // Transaction status is not yet confirmed
      return new Response(
        JSON.stringify({
          success: true,
          transaction_id: partnerTransactionId,
          status: 'PENDING',
          message: responseData?.message || 'Opération en cours de traitement',
          data: responseData,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (response.status === 203) {
      // A similar transaction was sent recently
      return new Response(
        JSON.stringify({
          success: false,
          transaction_id: partnerTransactionId,
          status: 'FAILED',
          message: responseData?.message || 'Une opération similaire a été envoyée il y a moins de 10 minutes',
          data: responseData,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (response.status === 207) {
      // Daily transaction limit reached
      return new Response(
        JSON.stringify({
          success: false,
          transaction_id: partnerTransactionId,
          status: 'FAILED',
          message: responseData?.message || 'Limite quotidienne de transactions atteinte',
          data: responseData,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (response.status === 300 || response.status === 400) {
      // Failed and closed transaction
      return new Response(
        JSON.stringify({
          success: false,
          transaction_id: partnerTransactionId,
          status: 'FAILED',
          message: responseData?.message || 'Transaction échouée',
          data: responseData,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (response.status === 401) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized - Vérifiez vos identifiants InTouch',
          details: responseData,
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (response.status === 403) {
      return new Response(
        JSON.stringify({
          error: 'Compte non autorisé à effectuer cette opération',
          details: responseData,
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: 'Erreur lors de l\'initiation du paiement',
          details: responseData || responseText,
          status: response.status,
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Succès par défaut
    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: partnerTransactionId,
        status: 'PENDING',
        message: 'Paiement initié avec succès',
        data: responseData,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[initiate-payment] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur lors de la requête',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
