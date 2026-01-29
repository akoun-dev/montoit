/**
 * Edge Function Supabase pour envoyer des liens de paiement InTouch
 * Cette fonction sert de proxy pour éviter les problèmes CORS
 */

import { serve } from 'https://deno.land/std@0.140.0/http/server.ts';

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();

    // Logging pour débogage
    console.log('Received request body:', JSON.stringify({
      email: body.email,
      destinataire: body.destinataire,
      motif: body.motif,
      montant: body.montant,
      langue: body.langue,
    }));

    // Validation des champs requis
    const { email, destinataire, motif, montant, langue } = body;

    // Vérification plus détaillée avec messages d'erreur spécifiques
    if (!destinataire || destinataire.trim() === '') {
      console.error('Missing or empty destinataire (phone number)');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Numéro de téléphone manquant. Veuillez compléter votre profil.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!motif || motif.trim() === '') {
      console.error('Missing or empty motif');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Description du paiement manquante.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!montant || montant <= 0) {
      console.error('Missing or invalid montant:', montant);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Montant invalide.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer les credentials depuis les variables d'environnement
    // CI300373 est le PARTNER_ID pour l'API Payment Link
    const partnerId = Deno.env.get('INTOUCH_PARTNER_ID') || 'CI300373';
    const loginAgent = Deno.env.get('INTOUCH_USERNAME') || '';
    const passwordAgent = Deno.env.get('INTOUCH_PASSWORD') || '';
    const baseUrl = 'https://apidist.gutouch.net/apidist/sec';

    console.log('InTouch config:', {
      partnerId,
      loginAgent: loginAgent ? 'set' : 'missing',
      passwordAgent: passwordAgent ? 'set' : 'missing',
    });

    // Vérifier que les credentials sont configurés
    if (!loginAgent || !passwordAgent) {
      console.error('InTouch credentials not configured');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Service de paiement non configuré. Contactez l\'administrateur.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Formatage du numéro de téléphone pour InTouch
    let formattedPhone = destinataire.replace(/\D/g, ''); // Enlever les caractères non-numériques
    if (formattedPhone.startsWith('225')) {
      formattedPhone = formattedPhone.substring(3); // Enlever l'indicatif pays 225
    }
    if (formattedPhone.startsWith('0')) {
      formattedPhone = formattedPhone.substring(1); // Enlever le 0 au début
    }

    // Générer les headers d'authentification Basic Auth
    const credentials = btoa(`${loginAgent}:${passwordAgent}`);
    const headers = {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Préparer le payload pour InTouch Payment Link API
    // Endpoint: /apidist/sec/{PARTNER_ID}/touchpaylink/initiate
    const intouchPayload = {
      email: email || '',
      destinataire: formattedPhone,
      motif: motif.trim(),
      montant: montant,
      langue: langue || 'fr',
    };

    console.log('Sending to InTouch API:', {
      url: `${baseUrl}/${partnerId}/touchpaylink/initiate`,
      payload: intouchPayload
    });

    // Appeler l'API InTouch
    const apiUrl = `${baseUrl}/${partnerId}/touchpaylink/initiate`;
    console.log(`[INTOUCH] Calling API: ${apiUrl}`);

    const intouchResponse = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(intouchPayload),
    });

    console.log(`[INTOUCH] Response status: ${intouchResponse.status}`);

    // Tentative de parsing de la réponse JSON
    let data;
    const responseText = await intouchResponse.text();
    console.log(`[INTOUCH] Response body:`, responseText);

    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[INTOUCH] Failed to parse JSON response:', parseError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid response from payment provider',
          details: responseText.substring(0, 200)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier si le lien de paiement a été créé avec succès
    // Le statut "202" indique succès pour InTouch Payment Link
    if (intouchResponse.ok && (data.statut === '202' || data.statut === '200' || data.link)) {
      console.log('[INTOUCH] Payment link created successfully:', data.link);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            service_id: data.service_id,
            destinataire: data.destinataire,
            motif: data.motif,
            email: data.email,
            link: data.link,
            montant: data.montant,
            statut: data.statut,
            message: data.message,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('[INTOUCH] API error:', data);
      return new Response(
        JSON.stringify({
          success: false,
          error: data.message || data.erreur || 'Erreur lors de la création du lien de paiement',
          details: data
        }),
        { status: intouchResponse.status >= 500 ? 500 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in intouch-send-link:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur de connexion au service de paiement',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
