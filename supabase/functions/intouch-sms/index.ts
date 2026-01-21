import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SMSRequest {
  phoneNumber: string;
  message: string;
  userId?: string;
  type?: string;
}

function generateTransactionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `MTT_SMS_${timestamp}_${random}`;
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

  if (cleaned.startsWith("225")) {
    cleaned = cleaned.substring(3);
  }

  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }

  return cleaned;
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
      userId,
      type = "general",
    } = await req.json() as SMSRequest;

    if (!phoneNumber || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: phoneNumber, message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!validatePhoneNumber(phoneNumber)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (message.length > 160) {
      console.warn(`[INTOUCH SMS] Message too long (${message.length} chars), will be split`);
    }

    const transactionId = generateTransactionId();
    const formattedPhone = formatPhoneNumber(phoneNumber);

    console.log(`[INTOUCH SMS] Sending SMS to ${formattedPhone}`);

    const intouchPayload = {
      recipient_phone_number: formattedPhone,
      message: message,
      partner_id: Deno.env.get("INTOUCH_PARTNER_ID") ?? "",
      partner_transaction_id: transactionId,
      login_api: Deno.env.get("INTOUCH_LOGIN_API") ?? "",
      password_api: Deno.env.get("INTOUCH_PASSWORD_API") ?? "",
    };

    const username = Deno.env.get("INTOUCH_USERNAME") ?? "";
    const password = Deno.env.get("INTOUCH_PASSWORD") ?? "";
    const credentials = btoa(`${username}:${password}`);

    const intouchUrl = `${Deno.env.get("INTOUCH_BASE_URL")}sms`;

    console.log(`[INTOUCH SMS] Calling ${intouchUrl}`);

    const intouchResponse = await fetch(intouchUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(intouchPayload),
    });

    const intouchResult = await intouchResponse.json();

    console.log(`[INTOUCH SMS] Response:`, JSON.stringify(intouchResult, null, 2));

    const status = intouchResult.status || intouchResponse.status;
    const isSuccess = status === 200 || status === "200" || intouchResponse.ok;

    const { data: smsLog, error: smsError } = await supabaseClient
      .from("sms_logs")
      .insert({
        user_id: userId,
        phone_number: phoneNumber,
        message: message,
        type: type,
        partner_transaction_id: transactionId,
        intouch_sms_id: intouchResult.sms_id || intouchResult.messageId,
        status: isSuccess ? "sent" : "failed",
        status_code: status,
        status_message: intouchResult.message,
        raw_response: intouchResult,
      })
      .select()
      .single();

    if (smsError) {
      console.error(`[INTOUCH SMS] Error saving SMS log:`, smsError);
    }

    return new Response(
      JSON.stringify({
        success: isSuccess,
        status: status,
        message: intouchResult.message || "SMS sent successfully",
        smsId: intouchResult.sms_id || intouchResult.messageId,
        partnerTransactionId: transactionId,
        smsLog: smsLog,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[INTOUCH SMS] Error:", error);

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
