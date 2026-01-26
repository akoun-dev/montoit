/**
 * Edge Function: send-sms-azure
 *
 * Envoi de SMS via Azure MTN SMS Gateway
 * Architecture: Frontend → Supabase Edge Function → Azure MTN API
 *
 * Configuration requise dans Supabase Secrets:
 * - AZURE_SMS_URL: URL de la passerelle SMS Azure
 * - AZURE_SMS_USERNAME: Nom d'utilisateur Azure
 * - AZURE_SMS_PASSWORD: Mot de passe Azure
 * - AZURE_SMS_FROM: Identifiant de l'expéditeur
 */

import { getCorsHeaders } from '../_shared/cors.ts';

interface SmsRequest {
  phone: string;    // Format E.164: +2250700000000
  message: string;  // Contenu SMS
  tag?: string;     // Label optionnel pour tracking (ex: "OTP", "NOTIF")
}

interface SmsResponse {
  status: 'ok' | 'error';
  messageId?: string;
  reason?: string;
}

/**
 * Valide le format E.164 du numéro de téléphone
 */
function validatePhone(phone: string): boolean {
  // Format E.164: + suivi de 8 à 15 chiffres
  const e164Regex = /^\+[1-9]\d{7,14}$/;
  return e164Regex.test(phone);
}

/**
 * Valide le payload de la requête
 */
function validatePayload(body: unknown): { valid: boolean; error?: string; data?: SmsRequest } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Corps de requête invalide' };
  }

  const { phone, message, tag } = body as Record<string, unknown>;

  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Numéro de téléphone requis' };
  }

  if (!validatePhone(phone)) {
    return { valid: false, error: 'Format de téléphone invalide. Utilisez le format E.164 (ex: +2250700000000)' };
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return { valid: false, error: 'Message requis et non vide' };
  }

  if (message.length > 160) {
    return { valid: false, error: 'Message trop long (max 160 caractères)' };
  }

  return {
    valid: true,
    data: {
      phone: phone.trim(),
      message: message.trim(),
      tag: typeof tag === 'string' ? tag.trim() : undefined,
    },
  };
}

/**
 * Construit l'URL pour l'API Azure MTN
 * IMPORTANT: Le + dans le numéro ne doit PAS être encodé (particularité de cette API)
 */
function buildAzureUrl(phone: string, message: string): string {
  // L'URL de base CORRECTE est /gateway/api (pas /client/)
  const baseUrl = Deno.env.get('AZURE_SMS_URL') || 'https://ansuthub.westeurope.cloudapp.azure.com/gateway/api';

  // Si l'URL configurée contient /client/, la remplacer par /gateway/api
  const cleanBaseUrl = baseUrl.replace(/\/client\/$/, '/gateway/api/');

  const username = Deno.env.get('AZURE_SMS_USERNAME') || '';
  const password = Deno.env.get('AZURE_SMS_PASSWORD') || '';
  const from = Deno.env.get('AZURE_SMS_FROM') || 'ANSUT';

  // Format attendu par l'API Azure MTN:
  // https://host/gateway/api/SendSMS?Username=X&Password=Y&From=Z&To=+2250140984943;&Text=Message&dlrUrl=
  // IMPORTANT: Le + dans To ne doit PAS être encodé (pas %2B)
  const encodedUsername = encodeURIComponent(username);
  const encodedPassword = encodeURIComponent(password);
  const encodedFrom = encodeURIComponent(from);
  const encodedText = encodeURIComponent(message);

  return `${cleanBaseUrl}SendSMS?Username=${encodedUsername}&Password=${encodedPassword}&From=${encodedFrom}&To=${phone};&Text=${encodedText}&dlrUrl=`;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ status: 'error', reason: 'Méthode non autorisée' } as SmsResponse),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Parse request body
    const body = await req.json();

    // Validate payload
    const validation = validatePayload(body);
    if (!validation.valid || !validation.data) {
      console.error('[send-sms-azure] Validation error:', validation.error);
      return new Response(
        JSON.stringify({ status: 'error', reason: validation.error } as SmsResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { phone, message } = validation.data;

    // Check Azure SMS configuration
    const azureUrl = Deno.env.get('AZURE_SMS_URL');
    const azureUsername = Deno.env.get('AZURE_SMS_USERNAME');
    const azurePassword = Deno.env.get('AZURE_SMS_PASSWORD');
    const azureFrom = Deno.env.get('AZURE_SMS_FROM');

    if (!azureUrl || !azureUsername || !azurePassword || !azureFrom) {
      console.error('[send-sms-azure] Azure SMS configuration missing');
      return new Response(
        JSON.stringify({ status: 'error', reason: 'Service SMS Azure non configuré' } as SmsResponse),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build Azure MTN URL
    const smsUrl = buildAzureUrl(phone, message);

    console.log('[send-sms-azure] Sending SMS to:', phone.substring(0, 6) + '****');
    console.log('[send-sms-azure] Message length:', message.length);

    // Call Azure MTN SMS API
    const azureResponse = await fetch(smsUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain',
      },
    });

    const responseText = await azureResponse.text();
    console.log('[send-sms-azure] Azure response status:', azureResponse.status);
    console.log('[send-sms-azure] Azure response:', responseText.substring(0, 200));

    if (!azureResponse.ok) {
      console.error('[send-sms-azure] Azure error:', azureResponse.status, responseText);

      return new Response(
        JSON.stringify({
          status: 'error',
          reason: `Erreur Azure MTN: ${responseText.substring(0, 200)}`
        } as SmsResponse),
        { status: azureResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Générer un ID de message unique basé sur le timestamp et le numéro
    const messageId = `AZURE_${Date.now()}_${phone.substring(phone.length - 6)}`;

    console.log('[send-sms-azure] SMS sent successfully, messageId:', messageId);

    return new Response(
      JSON.stringify({
        status: 'ok',
        messageId: messageId
      } as SmsResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-sms-azure] Unexpected error:', error instanceof Error ? error.message : 'Unknown');
    return new Response(
      JSON.stringify({ status: 'error', reason: 'Erreur interne du service SMS' } as SmsResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
