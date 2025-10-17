import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookData = await req.json();
    console.log('Webhook Mobile Money reçu:', webhookData);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { transactionRef, status, provider, amount } = webhookData;

    if (!transactionRef) {
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
              message: `Votre paiement de ${amount?.toLocaleString()} FCFA a été confirmé`,
              metadata: { transactionRef, provider }
            });
        }
      }
    }

    console.log(`Webhook traité: ${transactionRef} - ${status}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook traité' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur webhook:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
