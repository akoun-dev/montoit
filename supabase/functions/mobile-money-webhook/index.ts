import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyHmacSignature, extractSignature, logWebhookAttempt } from "../_shared/hmac.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature, x-intouch-signature',
};

function getClientIP(req: Request): string | null {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('x-real-ip') || 
         null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const clientIP = getClientIP(req);
  let rawBody = "";
  let webhookData: Record<string, unknown> = {};

  try {
    // 1. Lire le corps brut pour la vérification HMAC
    rawBody = await req.text();
    
    // 2. Vérifier la signature HMAC
    const signature = extractSignature(req);
    const webhookSecret = Deno.env.get('WEBHOOK_HMAC_SECRET');

    // Si le secret est configuré, la vérification est obligatoire
    if (webhookSecret) {
      if (!signature) {
        console.error('Mobile Money Webhook rejected: Missing signature');
        await logWebhookAttempt(supabase, {
          webhook_type: 'mobile_money',
          source_ip: clientIP,
          signature_provided: null,
          signature_valid: false,
          payload: {},
          processing_result: 'rejected',
          error_message: 'Missing signature header'
        });
        return new Response(
          JSON.stringify({ error: 'Unauthorized - Missing signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const isValid = await verifyHmacSignature(rawBody, signature, webhookSecret);
      
      if (!isValid) {
        console.error('Mobile Money Webhook rejected: Invalid signature');
        await logWebhookAttempt(supabase, {
          webhook_type: 'mobile_money',
          source_ip: clientIP,
          signature_provided: signature,
          signature_valid: false,
          payload: {},
          processing_result: 'rejected',
          error_message: 'Invalid HMAC signature'
        });
        return new Response(
          JSON.stringify({ error: 'Unauthorized - Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('Mobile Money Webhook signature verified successfully');
    } else {
      console.warn('WEBHOOK_HMAC_SECRET not configured - signature verification skipped');
    }

    // 3. Parser le JSON
    webhookData = JSON.parse(rawBody);
    console.log('Webhook Mobile Money reçu:', webhookData);

    const { transactionRef, status, provider, amount } = webhookData;

    if (!transactionRef) {
      await logWebhookAttempt(supabase, {
        webhook_type: 'mobile_money',
        source_ip: clientIP,
        signature_provided: signature,
        signature_valid: !!webhookSecret,
        payload: webhookData,
        processing_result: 'failed',
        error_message: 'Missing transactionRef'
      });
      return new Response(
        JSON.stringify({ error: 'transactionRef requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rechercher la transaction
    const { data: mmTransaction, error: findError } = await supabase
      .from('mobile_money_transactions')
      .select('*, payments(*)')
      .eq('transaction_ref', transactionRef)
      .single();

    if (findError || !mmTransaction) {
      console.error('Transaction non trouvée:', transactionRef);
      await logWebhookAttempt(supabase, {
        webhook_type: 'mobile_money',
        source_ip: clientIP,
        signature_provided: signature,
        signature_valid: true,
        payload: webhookData,
        processing_result: 'failed',
        error_message: 'Transaction not found'
      });
      return new Response(
        JSON.stringify({ error: 'Transaction non trouvée' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mettre à jour le statut de la transaction
    const { error: updateError } = await supabase
      .from('mobile_money_transactions')
      .update({
        status,
        provider_response: {
          ...mmTransaction.provider_response,
          webhookUpdate: webhookData,
          webhookTimestamp: new Date().toISOString()
        }
      })
      .eq('transaction_ref', transactionRef);

    if (updateError) {
      console.error('Erreur mise à jour transaction:', updateError);
      throw updateError;
    }

    // Mettre à jour le paiement si nécessaire
    if (mmTransaction.payment_id) {
      const paymentStatus = status === 'success' ? 'completed' : 'failed';
      
      await supabase
        .from('payments')
        .update({
          status: paymentStatus,
          ...(status === 'success' && { completed_at: new Date().toISOString() })
        })
        .eq('id', mmTransaction.payment_id);

      // Envoyer notification
      if (status === 'success') {
        const { data: payment } = await supabase
          .from('payments')
          .select('payer_id')
          .eq('id', mmTransaction.payment_id)
          .single();

        if (payment) {
          await supabase
            .from('notifications')
            .insert({
              user_id: payment.payer_id,
              type: 'payment_confirmed',
              title: 'Paiement confirmé',
              message: `Votre paiement de ${(amount as number)?.toLocaleString()} FCFA a été confirmé`,
              metadata: { transactionRef, provider }
            });
        }
      }
    }

    console.log(`Webhook traité: ${transactionRef} - ${status}`);

    // Log succès
    await logWebhookAttempt(supabase, {
      webhook_type: 'mobile_money',
      source_ip: clientIP,
      signature_provided: signature,
      signature_valid: true,
      payload: webhookData,
      processing_result: 'success',
      error_message: null
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook traité' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur webhook:', error);
    
    // Log erreur
    await logWebhookAttempt(supabase, {
      webhook_type: 'mobile_money',
      source_ip: clientIP,
      signature_provided: extractSignature(req),
      signature_valid: false,
      payload: webhookData,
      processing_result: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error'
    });

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
