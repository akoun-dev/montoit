/**
 * Edge Function: send-sms-brevo
 * 
 * Point d'entrée unique et sécurisé pour l'envoi de SMS via Brevo.
 * Cette fonction est conçue pour être whitelistée par IP chez Brevo.
 * 
 * Architecture: Frontend → Supabase Edge Function → Brevo API
 * La clé API Brevo n'est JAMAIS exposée côté client.
 */

import { detectCloudflareBlock, formatCloudflareError, getCloudflareUserMessage } from '../_shared/cloudflareDetector.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

interface SmsRequest {
  phone: string;    // Format E.164: +2250700000000
  message: string;  // Contenu SMS
  tag?: string;     // Label optionnel (ex: "OTP", "NOTIF")
}

interface SmsResponse {
  status: 'ok' | 'error';
  brevoMessageId?: string;
  reason?: string;
  cloudflareBlock?: boolean;
  rayId?: string;
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

const BREVO_SMS_ENDPOINT = 'https://api.brevo.com/v3/transactionalSMS/send';

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
      console.error('[send-sms-brevo] Validation error:', validation.error);
      return new Response(
        JSON.stringify({ status: 'error', reason: validation.error } as SmsResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { phone, message, tag } = validation.data;

    // Get Brevo API key from environment (never from client)
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    const brevoSenderEmail = Deno.env.get('BREVO_SENDER_EMAIL')
    const brevoSenderName = Deno.env.get('BREVO_SENDER_NAME')
    if (!brevoApiKey) {
      console.error('[send-sms-brevo] BREVO_API_KEY not configured');
      return new Response(
        JSON.stringify({ status: 'error', reason: 'Service SMS non configuré' } as SmsResponse),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare Brevo request
    // Utiliser un sender numérique au lieu d'un nom alphanumérique
    // Les noms alphanumériques nécessitent une validation spéciale
    const brevoPayload = {
      sender: brevoSenderName, // Sender numérique Brevo par défaut pour les tests
      recipient: phone,
      content: message,
      type: 'transactional',
      ...(tag && { tag }),
    };

    console.log('[send-sms-brevo] SMS Payload:', {
      sender: brevoPayload.sender,
      recipient: phone.substring(0, 6) + '****',
      contentLength: message.length,
      type: brevoPayload.type
    });

    console.log('[send-sms-brevo] Sending SMS to:', phone.substring(0, 6) + '****');

    // Call Brevo SMS API
    const brevoResponse = await fetch(BREVO_SMS_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(brevoPayload),
    });

    // Get response as text first for Cloudflare detection
    const responseText = await brevoResponse.text();
    
    // Detect Cloudflare block
    const cfInfo = detectCloudflareBlock(brevoResponse.status, responseText);
    
    if (cfInfo.isCloudflareBlock) {
      // Log detailed Cloudflare error
      console.error(formatCloudflareError(cfInfo, BREVO_SMS_ENDPOINT));
      
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          reason: getCloudflareUserMessage(cfInfo),
          cloudflareBlock: true,
          rayId: cfInfo.rayId
        } as SmsResponse),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log response status
    console.log('[send-sms-brevo] Brevo response status:', brevoResponse.status);
    
    if (!brevoResponse.ok) {
      // Try to parse error as JSON
      let errorMessage = 'Erreur lors de l\'envoi du SMS';
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = responseText.substring(0, 200);
      }
      
      console.error('[send-sms-brevo] Brevo error:', brevoResponse.status, errorMessage);
      
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          reason: errorMessage 
        } as SmsResponse),
        { status: brevoResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse successful response
    const brevoData = JSON.parse(responseText);
    console.log('[send-sms-brevo] SMS sent successfully, messageId:', brevoData.messageId);

    return new Response(
      JSON.stringify({ 
        status: 'ok', 
        brevoMessageId: brevoData.messageId 
      } as SmsResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-sms-brevo] Unexpected error:', error instanceof Error ? error.message : 'Unknown');
    return new Response(
      JSON.stringify({ status: 'error', reason: 'Erreur interne du service SMS' } as SmsResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
