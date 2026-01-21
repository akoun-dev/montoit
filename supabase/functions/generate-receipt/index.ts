import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { payment_id } = await req.json();

    if (!payment_id) {
      return new Response(
        JSON.stringify({ error: 'payment_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer le paiement
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .select('*, properties(title, address, city)')
      .eq('id', payment_id)
      .single();

    if (paymentError || !payment) {
      return new Response(
        JSON.stringify({ error: 'Paiement non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier que l'utilisateur est le payeur
    if (payment.payer_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Accès non autorisé' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer les infos du profil
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    // Générer un PDF simple (HTML to text pour le moment, PDF library à ajouter si besoin)
    const receiptContent = `
REÇU DE PAIEMENT - MON TOIT
=====================================

Numéro de reçu: ${payment.id}
Date: ${new Date(payment.completed_at || payment.created_at).toLocaleDateString('fr-FR')}

INFORMATIONS LOCATAIRE
-------------------------------------
Nom: ${profile?.full_name || 'N/A'}

DÉTAILS DU PAIEMENT
-------------------------------------
Type: ${payment.payment_type.replace('_', ' ').toUpperCase()}
Montant: ${payment.amount.toLocaleString()} FCFA
Statut: ${payment.status.toUpperCase()}
Méthode: ${payment.payment_method}
ID Transaction: ${payment.transaction_id || 'N/A'}

PROPRIÉTÉ
-------------------------------------
${payment.properties?.title || 'N/A'}
${payment.properties?.address || ''}, ${payment.properties?.city || ''}

=====================================
Ce reçu est généré automatiquement par Mon Toit
Propulsé par ANSUT
    `.trim();

    // Convertir en base64 (en production, utiliser une vraie lib PDF)
    const pdfBase64 = btoa(unescape(encodeURIComponent(receiptContent)));

    return new Response(
      JSON.stringify({ pdf: pdfBase64, filename: `recu-${payment.id}.txt` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating receipt:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
