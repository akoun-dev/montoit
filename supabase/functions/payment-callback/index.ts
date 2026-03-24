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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const url = new URL(req.url);

    // POST / - Reçoit les callbacks de paiement InTouch
    // Déployée sous /functions/v1/payment-callback
    if (req.method === 'POST') {
      const callbackData = await req.json();

      console.log('InTouch Callback received:', JSON.stringify(callbackData));

      const { transaction_id, status, amount: _amount, operator: _operator } = callbackData;

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

      // Si le paiement a échoué, envoyer une notification au locataire
      if ((status === 'FAILED' || status === 'CANCELLED') && transaction) {
        await handleFailedPayment(supabase, transaction, callbackData);
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

async function handleSuccessfulPayment(_supabase: Record<string, unknown>, transaction: Record<string, unknown>, _callbackData: Record<string, unknown>) {
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

  // 2. Fetch property and lease details for notification
  let propertyTitle = 'Votre bien';
  let ownerId = transaction.property_owner_id;

  if (transaction.lease_id) {
    const { data: lease } = await supabase
      .from('lease_contracts')
      .select('property_id, properties(title), owner_id')
      .eq('id', transaction.lease_id)
      .single();

    if (lease?.properties?.title) {
      propertyTitle = lease.properties.title;
    }
    if (lease?.owner_id) {
      ownerId = lease.owner_id;
    }
  }

  // 3. Envoyer notification au propriétaire via Edge Function
  if (ownerId) {
    try {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({
          action: 'payment_received',
          recipient_id: ownerId,
          property_title: propertyTitle,
          amount: transaction.amount,
          payment_method: transaction.operator || 'Mobile Money',
        }),
      });
      console.log('[Notification] Payment received notification sent to owner:', ownerId);
    } catch (error) {
      console.error('[Notification] Failed to send payment received notification:', error);
    }
  }

  // 4. Générer la quittance automatiquement
  if (transaction.lease_id) {
    await generateReceipt(supabase, transaction);
  }
}

async function handleFailedPayment(_supabase: Record<string, unknown>, transaction: Record<string, unknown>, _callbackData: Record<string, unknown>) {
  // Fetch property details for notification
  let propertyTitle = 'Votre bien';

  if (transaction.lease_id) {
    const { data: lease } = await supabase
      .from('lease_contracts')
      .select('property_id, properties(title)')
      .eq('id', transaction.lease_id)
      .single();

    if (lease?.properties?.title) {
      propertyTitle = lease.properties.title;
    }
  }

  // Envoyer notification au locataire via Edge Function
  if (transaction.tenant_id) {
    try {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({
          action: 'payment_failed',
          recipient_id: transaction.tenant_id,
          property_title: propertyTitle,
          amount: transaction.amount,
          payment_method: transaction.operator || 'Mobile Money',
        }),
      });
      console.log('[Notification] Payment failed notification sent to tenant:', transaction.tenant_id);
    } catch (error) {
      console.error('[Notification] Failed to send payment failed notification:', error);
    }
  }
}

async function generateReceipt(_supabase: Record<string, unknown>, transaction: Record<string, unknown>) {
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
