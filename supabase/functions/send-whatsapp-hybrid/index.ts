import { ServiceManager, ServiceConfig } from '../_shared/serviceManager.ts';
import { detectCloudflareBlock, formatCloudflareError } from '../_shared/cloudflareDetector.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const BREVO_WHATSAPP_ENDPOINT = 'https://api.brevo.com/v3/whatsapp/sendMessage';
interface WhatsAppRequest {
  phoneNumber: string;
  message: string;
}

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');

  // Ajouter le préfixe Côte d'Ivoire si nécessaire
  if (cleaned.startsWith('0')) {
    cleaned = '225' + cleaned;
  }

  if (!cleaned.startsWith('225')) {
    cleaned = '225' + cleaned;
  }

  return '+' + cleaned;
}

function validatePhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  // Préfixes valides en Côte d'Ivoire
  const validPrefixes = ['07', '05', '054', '055', '056', '01', '227'];
  return validPrefixes.some(prefix =>
    cleaned.startsWith(prefix) || cleaned.startsWith('225' + prefix)
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { phoneNumber, message } = await req.json() as WhatsAppRequest;

    if (!phoneNumber || !message) {
      return new Response(
        JSON.stringify({ error: 'Champs requis: phoneNumber, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validatePhoneNumber(phoneNumber)) {
      return new Response(
        JSON.stringify({ error: 'Format de numéro invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    const serviceManager = new ServiceManager();

    console.log(`📱 Envoi WhatsApp vers ${formattedPhone}...`);

    // Définir les handlers pour chaque fournisseur WhatsApp
    const handlers = {
      // InTouch - Fournisseur principal (priorité 1)
      intouch: async (_config: ServiceConfig, params: { phoneNumber: string; message: string }) => {
        const baseUrl = Deno.env.get('INTOUCH_BASE_URL');
        const partnerId = Deno.env.get('INTOUCH_PARTNER_ID');
        const username = Deno.env.get('INTOUCH_USERNAME');
        const password = Deno.env.get('INTOUCH_PASSWORD');

        if (!baseUrl || !partnerId || !username || !password) {
          throw new Error('InTouch credentials not configured');
        }

        // InTouch WhatsApp API endpoint
        const response = await fetch(`${baseUrl}/apidist/sec/${partnerId}/whatsapp/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
          },
          body: JSON.stringify({
            recipient: params.phoneNumber.replace('+', ''),
            message: params.message,
            partner_id: partnerId,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('InTouch WhatsApp error:', errorText);
          throw new Error(`InTouch WhatsApp failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ InTouch WhatsApp success:', data);

        return {
          success: true,
          messageId: data.message_id || data.id || data.transaction_id,
          provider: 'intouch',
        };
      },

      // Brevo - Fallback (priorité 2)
      brevo: async (_config: ServiceConfig, params: { phoneNumber: string; message: string }) => {
        const apiKey = Deno.env.get('BREVO_API_KEY');

        if (!apiKey) {
          throw new Error('Brevo API key not configured');
        }

        console.log(`[WHATSAPP-HYBRID] Calling Brevo: ${BREVO_WHATSAPP_ENDPOINT}`);

        const response = await fetch(BREVO_WHATSAPP_ENDPOINT, {
          method: 'POST',
          headers: {
            'api-key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            senderNumber: Deno.env.get('BREVO_WHATSAPP_SENDER') || 'MonToit',
            recipientNumber: params.phoneNumber,
            text: params.message,
          })
        });

        // Get response as text first for Cloudflare detection
        const responseText = await response.text();
        
        // Detect Cloudflare block
        const cfInfo = detectCloudflareBlock(response.status, responseText);
        
        if (cfInfo.isCloudflareBlock) {
          console.error(formatCloudflareError(cfInfo, BREVO_WHATSAPP_ENDPOINT));
          throw new Error(`Brevo blocked by Cloudflare. Ray ID: ${cfInfo.rayId || 'unknown'}`);
        }

        if (!response.ok) {
          let errorMessage = response.statusText;
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.message || errorMessage;
          } catch {
            errorMessage = responseText.substring(0, 200);
          }
          console.error('Brevo WhatsApp error:', errorMessage);
          throw new Error(`Brevo WhatsApp failed: ${errorMessage}`);
        }

        const result = JSON.parse(responseText);
        console.log('✅ Brevo WhatsApp success:', result);

        return {
          success: true,
          messageId: result.messageId || result.id,
          provider: 'brevo',
        };
      },
    };

    // Exécuter avec fallback automatique
    // ServiceManager lit la config depuis service_configurations
    // InTouch (priority 1) sera essayé d'abord, puis Brevo (priority 2) en fallback
    const result = await serviceManager.executeWithFallback(
      'whatsapp',
      handlers,
      { phoneNumber: formattedPhone, message }
    );

    // Logger le succès
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (supabaseUrl && supabaseKey) {
      await fetch(`${supabaseUrl}/rest/v1/whatsapp_logs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formattedPhone,
          message: message.substring(0, 500),
          provider: result.provider,
          status: 'success',
          transaction_id: result.messageId,
        }),
      }).catch(err => console.warn('Failed to log WhatsApp:', err));
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('❌ WhatsApp hybrid error:', errorMessage);

    // Logger l'échec
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (supabaseUrl && supabaseKey) {
      await fetch(`${supabaseUrl}/rest/v1/whatsapp_logs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: 'unknown',
          message: '',
          provider: 'none',
          status: 'failure',
          error_message: errorMessage,
        }),
      }).catch(err => console.warn('Failed to log error:', err));
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: 'Tous les fournisseurs WhatsApp ont échoué.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
