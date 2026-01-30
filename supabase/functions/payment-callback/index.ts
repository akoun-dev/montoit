/**
 * Edge Function Supabase pour gérer les callbacks de paiement InTouch
 * Documentation: https://apidist.gutouch.net/apidist/sec
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    // POST / - Reçoit les callbacks de paiement InTouch
    // Déployée sous /functions/v1/payment-callback
    if (req.method === 'POST') {
      const callbackData = await req.json();

      console.log('InTouch Callback received:', JSON.stringify(callbackData));

      const { transaction_id, status, amount, operator } = callbackData;

      if (!transaction_id) {
        return new Response(
          JSON.stringify({ error: 'Missing transaction_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Initialiser le client Supabase
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Mettre à jour la transaction dans Supabase
      const { data: transaction, error: updateError } = await supabase
        .from('transactions')
        .update({
          status: status === 'SUCCESS' ? 'success' : status.toLowerCase(),
          updated_at: new Date().toISOString(),
        })
        .eq('transaction_id', transaction_id)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to update transaction:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update transaction', details: updateError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Si le paiement est réussi, déclencher les actions post-paiement
      if (status === 'SUCCESS' && transaction) {
        await handleSuccessfulPayment(supabase, transaction, callbackData);
      }

      return new Response(
        JSON.stringify({ success: true, data: transaction }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET - Endpoint de test
    if (req.method === 'GET') {
      return new Response(
        JSON.stringify({
          message: 'InTouch Payment Callback Endpoint',
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
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleSuccessfulPayment(supabase: any, transaction: any, callbackData: any) {
  // 1. Mettre à jour le statut du paiement de loyer si applicable
  if (transaction.type === 'rental_payment' && transaction.lease_id) {
    await supabase
      .from('rent_payments')
      .insert({
        transaction_id: transaction.transaction_id,
        lease_id: transaction.lease_id,
        amount: transaction.amount,
        payment_date: new Date().toISOString(),
        status: 'paid',
      });
  }

  // 2. Envoyer notification au propriétaire
  if (transaction.property_owner_id) {
    await supabase.from('notifications').insert({
      user_id: transaction.property_owner_id,
      type: 'payment_received',
      title: 'Paiement reçu',
      message: `Un paiement de ${transaction.amount} FCFA a été reçu pour le bien ${transaction.property_id}`,
    });
  }

  // 3. Envoyer notification au locataire
  if (transaction.tenant_id) {
    await supabase.from('notifications').insert({
      user_id: transaction.tenant_id,
      type: 'payment_confirmed',
      title: 'Paiement confirmé',
      message: `Votre paiement de ${transaction.amount} FCFA a été confirmé avec succès`,
    });
  }

  // 4. Générer la quittance automatiquement
  if (transaction.lease_id) {
    await generateReceipt(supabase, transaction);
  }
}

async function generateReceipt(supabase: any, transaction: any) {
  const receiptData = {
    transaction_id: transaction.transaction_id,
    amount: transaction.amount,
    date: new Date().toISOString(),
    tenant_id: transaction.tenant_id,
    property_id: transaction.property_id,
    lease_id: transaction.lease_id,
  };

  try {
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-receipt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify(receiptData),
    });
    console.log('[Receipt] Generated for transaction:', transaction.transaction_id);
  } catch (error) {
    console.error('[Receipt] Failed to generate receipt:', error);
  }
}
