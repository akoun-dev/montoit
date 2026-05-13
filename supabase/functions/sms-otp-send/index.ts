/**
 * Edge Function: sms-otp-send
 *
 * Envoi de SMS via l'API Gateway Azure
 * Architecture: Frontend → Supabase Edge Function → Azure Gateway API
 *
 * Configuration requise dans Supabase Secrets:
 * - AZURE_SMS_URL: URL de la passerelle SMS Azure (https://ansuthub.westeurope.cloudapp.azure.com/gateway/api)
 * - AZURE_SMS_USERNAME: Nom d'utilisateur Azure
 * - AZURE_SMS_PASSWORD: Mot de passe Azure
 * - AZURE_SMS_FROM: Identifiant de l'expéditeur
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

interface SmsRequest {
  phone: string; // Format E.164: +2250700000000
  message: string; // Contenu SMS
  tag?: string; // Label optionnel pour tracking (ex: "OTP", "NOTIF")
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
    return {
      valid: false,
      error: 'Format de téléphone invalide. Utilisez le format E.164 (ex: +2250700000000)',
    };
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
 * IMPORTANT: L'API attend le numéro SANS le préfixe + (ex: 2250140984943, pas +2250140984943)
 */
function buildAzureUrl(phone: string, message: string): string {
  // L'URL de base CORRECTE est /gateway/api (pas /client/)
  const baseUrl =
    Deno.env.get('AZURE_SMS_URL') || 'https://ansuthub.westeurope.cloudapp.azure.com/gateway/api';

  // Si l'URL configurée contient /client/, la remplacer par /gateway/api
  let cleanBaseUrl = baseUrl.replace(/\/client\/$/, '/gateway/api');

  // S'assurer que l'URL se termine par un slash
  if (!cleanBaseUrl.endsWith('/')) {
    cleanBaseUrl += '/';
  }

  const username = Deno.env.get('AZURE_SMS_USERNAME') || '';
  const password = Deno.env.get('AZURE_SMS_PASSWORD') || '';
  const from = Deno.env.get('AZURE_SMS_FROM') || 'ANSUT';

  // Format attendu par l'API Azure MTN (selon collection Postman):
  // https://host/gateway/api/SendSMS?Username=X&Password=Y&From=Z&To=2250140984943;&Text=Message&dlrUrl=
  // IMPORTANT: Le numéro de téléphone doit être SANS le préfixe +
  const encodedUsername = encodeURIComponent(username);
  const encodedPassword = encodeURIComponent(password);
  const encodedFrom = encodeURIComponent(from);
  const encodedText = encodeURIComponent(message);

  // Retirer le préfixe + du numéro pour l'API Azure
  const phoneWithoutPrefix = phone.replace(/^\+/, '');

  return `${cleanBaseUrl}SendSMS?Username=${encodedUsername}&Password=${encodedPassword}&From=${encodedFrom}&To=${phoneWithoutPrefix};&Text=${encodedText}&dlrUrl=`;
}

serve(async (req: Request) => {
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
      console.error('[sms-otp-send] Validation error:', validation.error);
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

    // Enhanced logging for configuration (without exposing secrets)
    console.log('[sms-otp-send] Configuration check:', {
      hasUrl: !!azureUrl,
      hasUsername: !!azureUsername,
      hasPassword: !!azurePassword,
      hasFrom: !!azureFrom,
      url: azureUrl,
      username: azureUsername,
      from: azureFrom,
    });

    if (!azureUrl || !azureUsername || !azurePassword || !azureFrom) {
      console.error('[sms-otp-send] Azure SMS configuration missing:', {
        missing: [
          !azureUrl && 'AZURE_SMS_URL',
          !azureUsername && 'AZURE_SMS_USERNAME',
          !azurePassword && 'AZURE_SMS_PASSWORD',
          !azureFrom && 'AZURE_SMS_FROM',
        ].filter(Boolean),
      });
      return new Response(
        JSON.stringify({
          status: 'error',
          reason: 'Service SMS Azure non configuré',
        } as SmsResponse),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build Azure MTN URL
    const smsUrl = buildAzureUrl(phone, message);

    console.log('[sms-otp-send] Sending SMS to:', phone.substring(0, 6) + '****');
    console.log('[sms-otp-send] Message length:', message.length);
    console.log('[sms-otp-send] Message preview:', message.substring(0, 50) + '...');
    console.log(
      '[sms-otp-send] Using URL (sanitized):',
      smsUrl.replace(/Username=[^&]*/, 'Username=***').replace(/Password=[^&]*/, 'Password=***')
    );
    console.log('[sms-otp-send] Full URL components (sanitized):', {
      baseUrl: smsUrl.split('?')[0],
      hasUsername: smsUrl.includes('Username='),
      hasPassword: smsUrl.includes('Password='),
      fromParam: smsUrl.match(/From=([^&]+)/)?.[1],
      toParam: phone.substring(0, 6) + '****',
      textLength: message.length,
    });

    // Call Azure MTN SMS API with better error handling
    let azureResponse: Response;
    let responseText = '';

    try {
      console.log('[sms-otp-send] Attempting fetch to Azure MTN API...');
      console.log(
        '[sms-otp-send] Full URL (sanitized):',
        smsUrl.replace(/Username=[^&]*/, 'Username=***').replace(/Password=[^&]*/, 'Password=***')
      );
      azureResponse = await fetch(smsUrl, {
        method: 'GET',
        headers: {
          Accept: 'text/plain',
        },
      });

      responseText = await azureResponse.text();
      console.log('[sms-otp-send] Azure response status:', azureResponse.status);
      console.log('[sms-otp-send] Azure response length:', responseText.length);
      console.log(
        '[sms-otp-send] Azure response (first 500 chars):',
        responseText.substring(0, 500)
      );
    } catch (fetchError) {
      console.error('[sms-otp-send] Fetch error:', fetchError);
      return new Response(
        JSON.stringify({
          status: 'error',
          reason: `Erreur réseau Azure MTN: ${fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'}`,
        } as SmsResponse),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!azureResponse.ok) {
      console.error('[sms-otp-send] Azure error:', azureResponse.status, responseText);

      return new Response(
        JSON.stringify({
          status: 'error',
          reason: `Erreur Azure MTN (${azureResponse.status}): ${responseText.substring(0, 200) || 'No response text'}`,
        } as SmsResponse),
        {
          status: azureResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Analyser la réponse Azure - elle peut contenir des infos de statut détaillées
    let azureStatus = 'unknown';
    let azureReason = '';

    try {
      const responseData = JSON.parse(responseText);
      console.log('[sms-otp-send] Azure response parsed as JSON:', responseData);

      if (Array.isArray(responseData) && responseData.length > 0) {
        azureStatus = responseData[0].status || 'unknown';
        console.log('[sms-otp-send] Azure first item status:', azureStatus);
        console.log('[sms-otp-send] Azure first item full data:', responseData[0]);

        if (azureStatus === 'Rejected') {
          // Log detailed rejection info
          console.error('[sms-otp-send] Message rejected by Azure MTN. Details:', {
            status: azureStatus,
            fullResponse: responseData[0],
            phoneNumber: phone,
            senderId: azureFrom,
            messageLength: message.length,
          });
          azureReason = `Message rejeté par Azure MTN. Status: ${azureStatus}`;
          if (responseData[0].reason) {
            azureReason += ` - ${responseData[0].reason}`;
          }
          if (responseData[0].error) {
            azureReason += ` - Error: ${responseData[0].error}`;
          }
          if (responseData[0].description) {
            azureReason += ` - ${responseData[0].description}`;
          }
          // Fallback if no details provided
          if (azureReason === `Message rejeté par Azure MTN. Status: ${azureStatus}`) {
            azureReason += ' (vérifiez crédentials/credits/sender ID)';
          }
        } else if (azureStatus === 'Delivered') {
          azureReason = 'Message délivré avec succès';
        }
      } else {
        console.log('[sms-otp-send] Azure response is not an array or empty:', typeof responseData);
      }
    } catch (parseError) {
      // Réponse non JSON, on garde le texte brut
      console.log('[sms-otp-send] Azure response is not JSON, treating as text:', {
        textLength: responseText.length,
        textPreview: responseText.substring(0, 200),
        parseError: parseError instanceof Error ? parseError.message : String(parseError),
      });
      azureReason = responseText.substring(0, 100);
    }

    console.log('[sms-otp-send] Final Azure status:', azureStatus, 'reason:', azureReason);

    // Générer un ID de message unique basé sur le timestamp et le numéro
    const messageId = `AZURE_${Date.now()}_${phone.substring(phone.length - 6)}`;

    // Si le statut est Rejected, on retourne une erreur même si HTTP 200
    if (azureStatus === 'Rejected') {
      const errorResponse = {
        status: 'error' as const,
        reason: azureReason,
        azureStatus,
        diagnostic: {
          timestamp: new Date().toISOString(),
          phonePrefix: phone.substring(0, 6) + '****',
          senderId: azureFrom,
          azureUrl: azureUrl?.replace(/\/\/[^@]+@/, '//***@'),
        },
      };
      console.error('[sms-otp-send] Returning 422 with full context:', errorResponse);
      return new Response(
        JSON.stringify(errorResponse),
        {
          status: 422, // Unprocessable Entity - message valid mais rejeté par le provider
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[sms-otp-send] SMS sent successfully, messageId:', messageId);

    return new Response(
      JSON.stringify({
        status: 'ok',
        messageId: messageId,
      } as SmsResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(
      '[sms-otp-send] Unexpected error:',
      error instanceof Error ? error.message : 'Unknown'
    );
    return new Response(
      JSON.stringify({ status: 'error', reason: 'Erreur interne du service SMS' } as SmsResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
