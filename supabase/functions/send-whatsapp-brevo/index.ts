import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { detectCloudflareBlock, formatCloudflareError, getCloudflareUserMessage } from '../_shared/cloudflareDetector.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const BREVO_WHATSAPP_ENDPOINT = "https://api.brevo.com/v3/whatsapp/sendMessage";
interface WhatsAppBrevoRequest {
  phoneNumber: string;
  message: string;
  templateId?: string;
  params?: Record<string, unknown>;
}

function validatePhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "");
  const validPrefixes = ["07", "05", "054", "055", "056", "01", "227"];
  return validPrefixes.some(prefix =>
    cleaned.startsWith(prefix) || cleaned.startsWith("225" + prefix)
  );
}

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");

  if (!cleaned.startsWith("225")) {
    if (cleaned.startsWith("0")) {
      cleaned = cleaned.substring(1);
    }
    cleaned = "225" + cleaned;
  }

  return "+" + cleaned;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const {
      phoneNumber,
      message,
      templateId,
      params,
    } = await req.json() as WhatsAppBrevoRequest;

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: "Missing required field: phoneNumber" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!message && !templateId) {
      return new Response(
        JSON.stringify({ error: "Either message or templateId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!validatePhoneNumber(phoneNumber)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format for Côte d'Ivoire" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);

    console.log(`[WHATSAPP-BREVO] Sending WhatsApp via Brevo to ${formattedPhone}`);

    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoApiKey) {
      return new Response(
        JSON.stringify({ error: "BREVO_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Brevo WhatsApp API payload
    const brevoPayload: Record<string, unknown> = {
      to: formattedPhone,
    };

    if (templateId) {
      brevoPayload.template = {
        id: templateId,
        params: params || {},
      };
    } else {
      brevoPayload.text = message;
    }

    console.log(`[WHATSAPP-BREVO] Calling ${BREVO_WHATSAPP_ENDPOINT}`);

    const brevoResponse = await fetch(BREVO_WHATSAPP_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(brevoPayload),
    });

    // Get response as text first for Cloudflare detection
    const responseText = await brevoResponse.text();
    
    // Detect Cloudflare block
    const cfInfo = detectCloudflareBlock(brevoResponse.status, responseText);
    
    if (cfInfo.isCloudflareBlock) {
      console.error(formatCloudflareError(cfInfo, BREVO_WHATSAPP_ENDPOINT));
      
      // Log Cloudflare block
      await supabaseClient
        .from("whatsapp_logs")
        .insert({
          phone: phoneNumber,
          message: message || `Template: ${templateId}`,
          provider: "brevo",
          status: "failed",
          error_message: `Cloudflare block - Ray ID: ${cfInfo.rayId || 'unknown'}`,
        });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: getCloudflareUserMessage(cfInfo),
          cloudflareBlock: true,
          rayId: cfInfo.rayId,
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse JSON response
    let brevoResult: { messageId?: string; id?: string; message?: string; error?: string };
    try {
      brevoResult = JSON.parse(responseText);
    } catch {
      brevoResult = { message: responseText.substring(0, 200) };
    }

    console.log(`[WHATSAPP-BREVO] Response:`, JSON.stringify(brevoResult, null, 2));

    const isSuccess = brevoResponse.ok;
    const messageContent = message || `Template: ${templateId}`;

    // Logger dans whatsapp_logs avec les colonnes correctes
    const { error: logError } = await supabaseClient
      .from("whatsapp_logs")
      .insert({
        phone: phoneNumber,
        message: messageContent,
        provider: "brevo",
        status: isSuccess ? "sent" : "failed",
        transaction_id: brevoResult.messageId || brevoResult.id || null,
        error_message: isSuccess ? null : (brevoResult.message || brevoResult.error || null),
      });

    if (logError) {
      console.error(`[WHATSAPP-BREVO] Error saving log:`, logError);
    }

    if (!isSuccess) {
      return new Response(
        JSON.stringify({
          success: false,
          error: brevoResult.message || brevoResult.error || "Failed to send WhatsApp message",
          details: brevoResult,
        }),
        { status: brevoResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: brevoResponse.status,
        message: "WhatsApp message sent successfully via Brevo",
        messageId: brevoResult.messageId || brevoResult.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[WHATSAPP-BREVO] Error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
