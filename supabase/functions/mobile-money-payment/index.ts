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
    const { amount, phoneNumber, provider, paymentId, leaseId } = await req.json();

    console.log('Mobile Money Payment Request:', { amount, phoneNumber, provider, paymentId, leaseId });

    // Validation
    if (!amount || !phoneNumber || !provider || !paymentId) {
      return new Response(
        JSON.stringify({ error: 'Montant, numéro, provider et paymentId requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validation du provider
    const validProviders = ['orange_money', 'mtn_money', 'moov_money', 'wave'];
    if (!validProviders.includes(provider)) {
      return new Response(
        JSON.stringify({ error: 'Provider invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validation du numéro selon le provider
    const phoneValidation: any = {
      orange_money: /^(07|227)\d{8}$/,
      mtn_money: /^(05|054|055|056)\d{8}$/,
      moov_money: /^(01)\d{8}$/,
      wave: /^\d{8,10}$/
    };

    if (!phoneValidation[provider].test(phoneNumber.replace(/\s/g, ''))) {
      return new Response(
        JSON.stringify({ error: `Format de numéro invalide pour ${provider.replace('_', ' ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer les informations du paiement
    const { data: payment } = await supabase
      .from('payments')
      .select('*, leases(*)')
      .eq('id', paymentId)
      .single();

    if (!payment) {
      return new Response(
        JSON.stringify({ error: 'Paiement non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calcul des frais selon le provider
    let feesPercentage = 0.01; // 1% par défaut
    if (provider === 'wave') feesPercentage = 0.01;
    if (provider === 'orange_money') feesPercentage = 0.015; // 1.5%
    if (provider === 'mtn_money') feesPercentage = 0.015; // 1.5%
    if (provider === 'moov_money') feesPercentage = 0.012; // 1.2%

    const fees = Math.round(amount * feesPercentage);
    const totalAmount = amount + fees;

    // Générer référence unique
    const transactionRef = `MM${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    console.log(`Initiation paiement ${provider}: ${totalAmount} FCFA (frais: ${fees} FCFA)`);

    // Simulation d'appel API provider (en production, utiliser les vraies API)
    // Pour Orange Money: API OrangeMoney API
    // Pour MTN: MTN Mobile Money API
    // Pour Moov: Moov Money API
    // Pour Wave: Wave API
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simule délai API

    // Simulation de succès (90% de réussite)
    const isSuccess = Math.random() < 0.90;

    if (isSuccess) {
      // Créer la transaction mobile money
      const { data: mmTransaction, error: mmError } = await supabase
        .from('mobile_money_transactions')
        .insert({
          payment_id: paymentId,
          provider,
          phone_number: phoneNumber,
          transaction_ref: transactionRef,
          amount,
          fees,
          status: 'success',
          provider_response: {
            message: 'Paiement effectué avec succès',
            transactionId: transactionRef,
            timestamp: new Date().toISOString(),
            provider: provider,
            phoneNumber: phoneNumber.substring(0, 3) + '****' + phoneNumber.substring(7)
          }
        })
        .select()
        .single();

      if (mmError) {
        console.error('Erreur création transaction MM:', mmError);
        throw mmError;
      }

      // Mettre à jour le paiement
      await supabase
        .from('payments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          transaction_id: transactionRef
        })
        .eq('id', paymentId);

      // Envoyer email de confirmation
      try {
        const { data: payer } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', payment.payer_id)
          .single();

        await supabase.functions.invoke('send-email', {
          body: {
            to: payment.payer_id, // Récupérer l'email via auth
            subject: 'Confirmation de paiement',
            template: 'payment-confirmation',
            data: {
              userName: payer?.full_name || 'Utilisateur',
              amount,
              paymentType: payment.payment_type,
              transactionRef,
              provider: provider.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
            }
          }
        });
      } catch (emailError) {
        console.error('Erreur envoi email:', emailError);
      }

      console.log(`Paiement ${transactionRef} réussi`);

      return new Response(
        JSON.stringify({
          success: true,
          transactionRef,
          amount,
          fees,
          totalAmount,
          provider,
          status: 'success',
          message: `Paiement de ${amount.toLocaleString()} FCFA effectué avec succès`,
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Paiement échoué
      await supabase
        .from('mobile_money_transactions')
        .insert({
          payment_id: paymentId,
          provider,
          phone_number: phoneNumber,
          transaction_ref: transactionRef,
          amount,
          fees,
          status: 'failed',
          provider_response: {
            error: 'Solde insuffisant ou transaction refusée',
            timestamp: new Date().toISOString()
          }
        });

      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', paymentId);

      // Envoyer email d'échec
      try {
        const { data: payer } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', payment.payer_id)
          .single();

        await supabase.functions.invoke('send-email', {
          body: {
            to: payment.payer_id,
            subject: 'Échec de paiement',
            template: 'payment-failed',
            data: {
              userName: payer?.full_name || 'Utilisateur',
              amount,
              reason: 'Solde insuffisant ou transaction refusée par le provider',
              provider: provider.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
            }
          }
        });
      } catch (emailError) {
        console.error('Erreur envoi email:', emailError);
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Transaction échouée. Vérifiez votre solde et réessayez.',
          status: 'failed',
          transactionRef
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in mobile-money-payment:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
