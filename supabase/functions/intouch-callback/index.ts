/**
 * Edge Function Supabase pour gérer les callbacks de paiement InTouch
 * Documentation: https://developers.intouchgroup.net/documentation/CALLBACK
 */

import { serve } from 'https://deno.land/std@0.140.0/http/server.ts';

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // POST /intouch/callback - Reçoit les callbacks de paiement
    if (req.method === 'POST' && url.pathname === '/intouch/callback') {
      const callbackData = await req.json();

      console.log('InTouch Callback received:', JSON.stringify(callbackData));

      // Les données de callback contiennent:
      // - numTransaction: Numéro de transaction
      // - idFromClient: ID de transaction du client
      // - status: SUCCESSFUL, FAILED, etc.
      // - amount: Montant
      // - recipientNumber: Numéro du bénéficiaire
      // - dateTime: Date de la transaction

      const { numTransaction, idFromClient, status, amount, recipientNumber } = callbackData;

      if (!numTransaction) {
        return new Response(
          JSON.stringify({ error: 'Missing numTransaction' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mettre à jour le paiement dans la base de données
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

      // Trouver le paiement par transaction_id
      const paymentResponse = await fetch(
        `${supabaseUrl}/rest/v1/payments?transaction_id=eq.${numTransaction}&select=*`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      );

      const payments = await paymentResponse.json();

      if (payments.length > 0) {
        const payment = payments[0];

        // Mettre à jour le statut
        const updateData: any = {
          status: status === 'SUCCESSFUL' ? 'complete' : 'echoue',
        };

        // Ajouter les informations de transaction
        if (callbackData.provider) {
          updateData.provider = callbackData.provider;
        }
        if (callbackData.fees) {
          updateData.fees = callbackData.fees;
        }

        await fetch(
          `${supabaseUrl}/rest/v1/payments?id=eq.${payment.id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
          }
        );

        // Si le paiement est pour un loyer et est réussi, mettre à jour la table des loyers
        if (payment.payment_type === 'loyer' && status === 'SUCCESSFUL') {
          // Créer ou mettre à jour l'enregistrement de loyer
          await fetch(
            `${supabaseUrl}/rest/v1/rent_payments`,
            {
              method: 'POST',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
              },
              body: JSON.stringify({
                payment_id: payment.id,
                tenant_id: payment.tenant_id,
                property_id: payment.property_id,
                lease_id: payment.lease_id,
                amount: payment.amount,
                payment_date: new Date().toISOString(),
                payment_method: payment.payment_method,
                provider: payment.provider,
                status: 'paye',
              }),
            }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Callback processed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.warn('Payment not found for transaction:', numTransaction);
        return new Response(
          JSON.stringify({ error: 'Payment not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // GET /intouch/callback - Endpoint de test
    if (req.method === 'GET' && url.pathname === '/intouch/callback') {
      return new Response(
        JSON.stringify({
          message: 'InTouch Callback Endpoint',
          methods: ['POST'],
          description: 'Reçoit les notifications de paiement de la part d\'InTouch'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not Found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing callback:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
