import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InTouchCashinRequest {
  service_id: string;
  recipient_phone_number: string;
  amount: number;
  partner_id: string;
  partner_transaction_id: string;
  login_api: string;
  password_api: string;
  call_back_url: string;
}

interface PaymentRequest {
  provider: "orange_money" | "mtn_money" | "moov_money" | "wave";
  phoneNumber: string;
  amount: number;
  leaseId: string;
  description?: string;
}

const SERVICE_IDS = {
  orange_money: "CASHINOMCIPART2",
  mtn_money: "CASHINMTNPART2",
  moov_money: "CASHINMOOVPART2",
  wave: "CI_CASHIN_WAVE_PART",
};

function generateTransactionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `MTT${timestamp}${random}`;
}

function validatePhoneNumber(phone: string, provider: string): boolean {
  const cleaned = phone.replace(/\D/g, "");

  switch (provider) {
    case "orange_money":
      return cleaned.startsWith("07") || cleaned.startsWith("227");
    case "mtn_money":
      return cleaned.startsWith("05") || cleaned.startsWith("054") || cleaned.startsWith("055") || cleaned.startsWith("056");
    case "moov_money":
      return cleaned.startsWith("01");
    case "wave":
      return cleaned.length >= 8 && cleaned.length <= 10;
    default:
      return false;
  }
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      provider,
      phoneNumber,
      amount,
      leaseId,
      description = "Paiement de loyer Mon Toit",
    } = (await req.json()) as PaymentRequest;

    if (!provider || !phoneNumber || !amount || !leaseId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (amount < 100) {
      return new Response(
        JSON.stringify({ error: "Amount must be at least 100 FCFA" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!validatePhoneNumber(phoneNumber, provider)) {
      return new Response(
        JSON.stringify({ error: `Invalid phone number for ${provider}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[INTOUCH Payment] User ${user.id} paying ${amount} FCFA via ${provider}`);

    const transactionId = generateTransactionId();
    const serviceId = SERVICE_IDS[provider];
    const formattedPhone = formatPhoneNumber(phoneNumber);

    const intouchRequest: InTouchCashinRequest = {
      service_id: serviceId,
      recipient_phone_number: formattedPhone,
      amount,
      partner_id: Deno.env.get("INTOUCH_PARTNER_ID") ?? "",
      partner_transaction_id: transactionId,
      login_api: Deno.env.get("INTOUCH_LOGIN_API") ?? "",
      password_api: Deno.env.get("INTOUCH_PASSWORD_API") ?? "",
      call_back_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/intouch-webhook-handler`,
    };

    const username = Deno.env.get("INTOUCH_USERNAME") ?? "";
    const password = Deno.env.get("INTOUCH_PASSWORD") ?? "";
    const credentials = btoa(`${username}:${password}`);

    const intouchUrl = `${Deno.env.get("INTOUCH_BASE_URL")}cashin`;

    console.log(`[INTOUCH Payment] Calling ${intouchUrl}`);

    const intouchResponse = await fetch(intouchUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(intouchRequest),
    });

    if (!intouchResponse.ok) {
      const errorData = await intouchResponse.json().catch(() => ({}));
      throw new Error(errorData.message || `IN TOUCH error: ${intouchResponse.status}`);
    }

    const intouchData = await intouchResponse.json();

    console.log(`[INTOUCH Payment] Response:`, JSON.stringify(intouchData, null, 2));

    const status = intouchData.status || intouchResponse.status;
    const isSuccess = status === 200 || status === "200" || status === "SUCCESS";
    const isPending = status === 201 || status === "PENDING" || status === "PROCESSING";

    const { data: payment, error: insertError } = await supabaseClient
      .from("payments")
      .insert({
        lease_id: leaseId,
        tenant_id: user.id,
        amount,
        status: isSuccess ? "completed" : isPending ? "processing" : "failed",
        payment_method: "mobile_money",
        provider,
        phone_number: phoneNumber,
        transaction_reference: transactionId,
        intouch_transaction_id: intouchData.transaction_id,
        intouch_status: intouchData.status,
        intouch_callback_data: intouchData,
        metadata: { description },
        paid_at: isSuccess ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to save payment: ${insertError.message}`);
    }

    await supabaseClient.from("mobile_money_transactions").insert({
      payment_id: payment?.id || transactionId,
      provider,
      phone_number: phoneNumber,
      amount,
      status: isSuccess ? "completed" : isPending ? "processing" : "failed",
      intouch_request: intouchRequest,
      intouch_response: intouchData,
    });

    if (isSuccess || isPending) {
      await supabaseClient.functions.invoke("intouch-sms", {
        body: {
          phoneNumber: phoneNumber,
          message: `Paiement de ${amount.toLocaleString()} FCFA ${isSuccess ? "reçu" : "en cours"}. Ref: ${transactionId.substring(0, 16)}`,
          userId: user.id,
          type: "payment_confirmation",
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: isSuccess || isPending,
        paymentId: payment?.id,
        partnerTransactionId: transactionId,
        transactionId: intouchData.transaction_id,
        status: isSuccess ? "completed" : isPending ? "processing" : "failed",
        amount,
        provider,
        pending: isPending,
        message: intouchData.message || "Payment initiated successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Payment error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
