import { ServiceManager, ServiceConfig } from '../_shared/serviceManager.ts';
import { edgeLogger } from '../_shared/logger.ts';
import { detectCloudflareBlock, formatCloudflareError } from '../_shared/cloudflareDetector.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import type { SMSRequest, SMSHandlerParams, SMSSuccessResponse } from '../_shared/types/sms.types.ts';

const BREVO_SMS_ENDPOINT = 'https://api.brevo.com/v3/transactionalSMS/sms';
const FETCH_TIMEOUT_MS = 10000; // 10 seconds timeout

interface InTouchSMSResponse {
  message_id?: string;
  id?: string;
  transaction_id?: string;
}

interface BrevoSMSResponse {
  messageId: string;
  reference?: string;
}

interface AzureSMSResult {
  successful: boolean;
  messageId?: string;
  errorMessage?: string;
}

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(
  url: string, 
  options: RequestInit, 
  timeoutMs: number = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { 
      ...options, 
      signal: controller.signal 
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');

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
  const validPrefixes = ['07', '05', '054', '055', '056', '01', '227'];
  return validPrefixes.some(prefix =>
    cleaned.startsWith(prefix) || cleaned.startsWith('225' + prefix)
  );
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { phoneNumber, message, sender = 'MonToit' } = await req.json() as SMSRequest;

    if (!phoneNumber || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: phoneNumber, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validatePhoneNumber(phoneNumber)) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone number format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (message.length > 160) {
      return new Response(
        JSON.stringify({ error: 'Message too long (max 160 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    const serviceManager = new ServiceManager();

    // Define handlers for each SMS provider
    const handlers: Record<string, (config: ServiceConfig, params: SMSHandlerParams) => Promise<SMSSuccessResponse>> = {
      intouch: async (config: ServiceConfig, params: SMSHandlerParams): Promise<SMSSuccessResponse> => {
        // InTouch credentials
        const partnerId = Deno.env.get('INTOUCH_PARTNER_ID');
        const username = Deno.env.get('INTOUCH_USERNAME');
        const password = Deno.env.get('INTOUCH_PASSWORD');
        const loginApi = Deno.env.get('INTOUCH_LOGIN_API');
        const passwordApi = Deno.env.get('INTOUCH_PASSWORD_API');
        const agencyCode = Deno.env.get('INTOUCH_AGENCY_CODE') || 'ANSUT13287';

        if (!partnerId || !username || !password || !loginApi || !passwordApi) {
          throw new Error('InTouch credentials not configured');
        }

        // InTouch SMS API endpoint with dynamic agency code
        const intouchUrl = `https://apidist.gutouch.net/apidist/sec/${agencyCode}/sms`;
        
        // Generate unique transaction ID
        const transactionId = `MTT_SMS_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        
        // Format phone number (digits only)
        const cleanPhone = params.phoneNumber.replace(/\D/g, '');
        
        edgeLogger.info('InTouch SMS request', { 
          url: intouchUrl, 
          phone: cleanPhone,
          transactionId,
          timeout: FETCH_TIMEOUT_MS
        });

        const response = await fetchWithTimeout(intouchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
          },
          body: JSON.stringify({
            partner_id: partnerId,
            partner_transaction_id: transactionId,
            login_api: loginApi,
            password_api: passwordApi,
            recipient_phone_number: cleanPhone,
            message: params.message,
            sender_id: config.config?.sender || params.sender || 'MonToit',
          }),
        });

        const responseText = await response.text();
        edgeLogger.info('InTouch SMS response', { 
          status: response.status, 
          body: responseText.substring(0, 500) 
        });

        if (!response.ok) {
          edgeLogger.error('InTouch SMS error', undefined, { 
            status: response.status, 
            error: responseText 
          });
          throw new Error(`InTouch SMS failed: ${response.status} - ${responseText}`);
        }

        let data: InTouchSMSResponse;
        try {
          data = JSON.parse(responseText) as InTouchSMSResponse;
        } catch {
          data = { transaction_id: transactionId };
        }
        
        edgeLogger.info('InTouch SMS success', { 
          messageId: data.message_id || data.id || data.transaction_id || transactionId 
        });

        return {
          success: true,
          messageId: data.message_id || data.id || data.transaction_id || transactionId,
          provider: 'intouch',
        };
      },

      azure: async (config: ServiceConfig, params: SMSHandlerParams): Promise<SMSSuccessResponse> => {
        const { SmsClient } = await import('https://esm.sh/@azure/communication-sms');
        const connectionString = Deno.env.get('AZURE_COMMUNICATION_CONNECTION_STRING');

        if (!connectionString) {
          throw new Error('Azure Communication connection string not configured');
        }

        const client = new SmsClient(connectionString);
        const configWithFrom = config.config as { from?: string } | undefined;

        const sendResults = await client.send({
          from: configWithFrom?.from || '+1234567890',
          to: [params.phoneNumber],
          message: params.message,
        }) as AzureSMSResult[];

        if (!sendResults[0]?.successful) {
          throw new Error(`Azure SMS failed: ${sendResults[0]?.errorMessage}`);
        }

        return {
          success: true,
          messageId: sendResults[0].messageId,
          provider: 'azure',
        };
      },

      brevo: async (config: ServiceConfig, params: SMSHandlerParams): Promise<SMSSuccessResponse> => {
        const apiKey = Deno.env.get('BREVO_API_KEY');

        if (!apiKey) {
          throw new Error('Brevo API key not configured');
        }

        edgeLogger.info('Brevo SMS request', { 
          phone: params.phoneNumber,
          timeout: FETCH_TIMEOUT_MS
        });
        
        const configWithSender = config.config as { sender?: string } | undefined;
        
        const response = await fetchWithTimeout(BREVO_SMS_ENDPOINT, {
          method: 'POST',
          headers: {
            'api-key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            sender: (configWithSender?.sender || params.sender || 'ANSUT').substring(0, 11),
            recipient: params.phoneNumber,
            content: params.message,
            type: 'transactional'
          })
        });

        const responseText = await response.text();
        
        // Detect Cloudflare block
        const cfInfo = detectCloudflareBlock(response.status, responseText);
        
        if (cfInfo.isCloudflareBlock) {
          edgeLogger.error('Brevo SMS Cloudflare block', undefined, { 
            rayId: cfInfo.rayId, 
            blockedIp: cfInfo.blockedIp 
          });
          throw new Error(`Brevo blocked by Cloudflare. Ray ID: ${cfInfo.rayId || 'unknown'}`);
        }

        if (!response.ok) {
          edgeLogger.error('Brevo SMS error', undefined, { 
            status: response.status, 
            error: responseText.substring(0, 200) 
          });
          try {
            const errorData = JSON.parse(responseText) as { message?: string };
            throw new Error(`Brevo SMS failed: ${errorData.message || response.statusText}`);
          } catch {
            throw new Error(`Brevo SMS failed: ${response.status} - ${responseText.substring(0, 200)}`);
          }
        }

        const result = JSON.parse(responseText) as BrevoSMSResponse;
        edgeLogger.info('Brevo SMS success', { messageId: result.messageId });
        return {
          success: true,
          messageId: result.messageId,
          reference: result.reference,
          provider: 'brevo',
        };
      },
    };

    // Execute with automatic fallback
    const result = await serviceManager.executeWithFallback(
      'sms',
      handlers,
      { phoneNumber: formattedPhone, message, sender }
    );

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    edgeLogger.error('Error sending SMS with hybrid system', error instanceof Error ? error : undefined);

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: 'All SMS providers failed. Please check service configuration.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
