import { edgeLogger } from "../_shared/logger.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import type { OTPRequest } from "../_shared/types/sms.types.ts";

const RATE_LIMIT_SECONDS = 60;

/**
 * SIMPLIFIED send-auth-otp
 * - No mode (login/register) - we just send the OTP
 * - Account detection is done in verify-auth-otp after OTP validation
 */
Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { phoneNumber, method = 'whatsapp' }: OTPRequest = await req.json();

    // Validation
    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: 'Numéro de téléphone requis' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Normaliser le numéro (Côte d'Ivoire)
    // Format attendu: 2250XXXXXXXXX (13 chiffres)
    let normalizedPhone = phoneNumber.replace(/\D/g, '');
    
    // Ajouter le préfixe 225 si absent (GARDER le 0 initial)
    if (!normalizedPhone.startsWith('225')) {
      normalizedPhone = '225' + normalizedPhone;
    }
    
    // Validation: numéro ivoirien = 225 + 10 chiffres = 13 chiffres
    if (normalizedPhone.length < 13) {
      return new Response(
        JSON.stringify({ error: 'Numéro de téléphone invalide' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // ========== RATE LIMITING CHECK ==========
    const rateLimitCutoff = new Date(Date.now() - RATE_LIMIT_SECONDS * 1000).toISOString();
    
    const rateLimitResponse = await fetch(
      `${supabaseUrl}/rest/v1/verification_codes?phone=eq.${normalizedPhone}&created_at=gt.${rateLimitCutoff}&select=created_at&order=created_at.desc&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
      }
    );

    if (rateLimitResponse.ok) {
      const recentCodes = await rateLimitResponse.json() as Array<{ created_at: string }>;
      
      if (recentCodes && recentCodes.length > 0) {
        const lastSentAt = new Date(recentCodes[0].created_at);
        const elapsedSeconds = (Date.now() - lastSentAt.getTime()) / 1000;
        const remainingSeconds = Math.ceil(RATE_LIMIT_SECONDS - elapsedSeconds);
        
        edgeLogger.info('Rate limit active', { remainingSeconds, phone: normalizedPhone });
        
        return new Response(
          JSON.stringify({
            error: `Veuillez patienter ${remainingSeconds} secondes`,
            retryAfter: remainingSeconds,
            rateLimited: true,
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // ========== GÉNÉRER ET STOCKER L'OTP ==========
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const storeResponse = await fetch(`${supabaseUrl}/rest/v1/verification_codes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        phone: normalizedPhone,
        code: otp,
        type: method,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
        max_attempts: 3,
      }),
    });

    if (!storeResponse.ok) {
      const errorText = await storeResponse.text();
      edgeLogger.error('Failed to store OTP', undefined, { error: errorText });
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la génération du code' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========== ENVOYER L'OTP VIA SMS/WHATSAPP ==========
    // Utiliser directement Brevo pour éviter les erreurs de providers
    const functionUrl = `${supabaseUrl}/functions/v1/send-sms-brevo`;

    const message = `MonToit: Votre code de verification est ${otp}. Valide 10min. Ne partagez jamais ce code.`;
    const e164Phone = `+${normalizedPhone}`; // Garder le format E.164 complet pour Brevo

    edgeLogger.info('Sending OTP via Brevo', { method, phone: normalizedPhone });

    // Envoyer directement via Brevo SMS
    const provider = 'brevo-sms';

    const sendResponse = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: e164Phone,
        message: message,
        tag: 'AUTH_OTP',
      }),
    });

    const sendResult = await sendResponse.json() as { status?: string; reason?: string; messageId?: string };

    if (!sendResponse.ok || sendResult.status !== 'ok') {
      edgeLogger.error('SMS send failed', {
        error: sendResult.reason || 'Unknown error',
        phone: normalizedPhone.slice(-4),
        provider,
        status: sendResponse.status
      });

      return new Response(
        JSON.stringify({
          error: sendResult.reason || 'Service SMS indisponible. Veuillez réessayer plus tard.',
          code: 'SMS_SEND_FAILED'
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      edgeLogger.info('SMS sent successfully', {
        method,
        phone: normalizedPhone,
        provider,
        messageId: sendResult.messageId
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Code envoyé par ${method === 'sms' ? 'SMS' : 'WhatsApp'}`,
        provider,
        expiresIn: 600,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    edgeLogger.error('Error in send-auth-otp', error instanceof Error ? error : undefined);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
