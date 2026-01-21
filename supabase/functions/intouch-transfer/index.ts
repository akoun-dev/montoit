import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TransferRequest {
  paymentId: string;
  landlordId: string;
  amount: number;
  provider: "orange_money" | "mtn_money" | "moov_money" | "wave";
  phoneNumber: string;
  landlordInfo: {
    email: string;
    firstName: string;
    lastName: string;
  };
}

const SERVICE_IDS = {
  orange_money: "PAIEMENTMARCHANDOMPAYCIDIRECT",
  mtn_money: "PAIEMENTMARCHAND_MTN_CI",
  moov_money: "PAIEMENTMARCHAND_MOOV_CI",
  wave: "CI_PAIEMENTWAVE_TP",
};

function generateTransactionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `MTT_TRANSFER_${timestamp}_${random}`;
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

function calculateFees(amount: number): { platformFee: number; providerFee: number; totalFees: number; netAmount: number } {
  const platformFeePercentage = 0.05;
  const providerFeePercentage = 0.015;

  const platformFee = amount * platformFeePercentage;
  const providerFee = amount * providerFeePercentage;
  const totalFees = platformFee + providerFee;
  const netAmount = amount - totalFees;

  return { platformFee, providerFee, totalFees, netAmount };
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
      paymentId,
      landlordId,
      amount,
      provider,
      phoneNumber,
      landlordInfo,
    } = await req.json() as TransferRequest;

    if (!paymentId || !landlordId || !amount || !provider || !phoneNumber || !landlordInfo) {
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

    console.log(`[INTOUCH Transfer] Transferring ${amount} FCFA to landlord ${landlordId} via ${provider}`);

    const transactionId = generateTransactionId();
    const serviceCode = SERVICE_IDS[provider];
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const { totalFees, netAmount } = calculateFees(amount);

    const intouchPayload = {
      idFromClient: transactionId,
      additionnalInfos: {
        recipientEmail: landlordInfo.email,
        recipientFirstName: landlordInfo.firstName,
        recipientLastName: landlordInfo.lastName,
        destinataire: formattedPhone,
      },
      amount: Math.round(netAmount),
      callback: `${Deno.env.get("SUPABASE_URL")}/functions/v1/intouch-webhook-handler`,
      recipientNumber: formattedPhone,
      serviceCode: serviceCode,
    };

    const username = Deno.env.get("INTOUCH_USERNAME") ?? "";
    const password = Deno.env.get("INTOUCH_PASSWORD") ?? "";
    const credentials = btoa(`${username}:${password}`);

    const intouchUrl = `${Deno.env.get("INTOUCH_BASE_URL")}payout`;

    console.log(`[INTOUCH Transfer] Calling ${intouchUrl}`);

    const intouchResponse = await fetch(intouchUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(intouchPayload),
    });

    if (!intouchResponse.ok) {
      const errorData = await intouchResponse.json().catch(() => ({}));
      throw new Error(errorData.message || `INTOUCH error: ${intouchResponse.status}`);
    }

    const intouchData = await intouchResponse.json();

    console.log(`[INTOUCH Transfer] Response:`, JSON.stringify(intouchData, null, 2));

    const status = intouchData.status || intouchResponse.status;
    const isSuccess = status === 200 || status === "200" || status === "SUCCESS";
    const isPending = status === 201 || status === "PENDING" || status === "PROCESSING";

    const { data: transfer, error: transferError } = await supabaseClient
      .from("landlord_transfers")
      .insert({
        payment_id: paymentId,
        landlord_id: landlordId,
        amount: amount,
        fees: totalFees,
        net_amount: netAmount,
        provider: provider,
        phone_number: phoneNumber,
        partner_transaction_id: transactionId,
        intouch_transaction_id: intouchData.transaction_id,
        status: isSuccess ? "completed" : isPending ? "processing" : "failed",
        status_code: status,
        status_message: intouchData.message,
        raw_response: intouchData,
        transferred_at: isSuccess ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (transferError) {
      console.error(`[INTOUCH Transfer] Error saving transfer:`, transferError);
      throw new Error(`Failed to save transfer: ${transferError.message}`);
    }

    if (isSuccess) {
      await supabaseClient.functions.invoke("intouch-sms", {
        body: {
          phoneNumber: phoneNumber,
          message: `Vous avez reçu ${Math.round(netAmount).toLocaleString()} FCFA sur votre compte ${provider.replace("_", " ")}. Ref: ${transactionId.substring(0, 16)}`,
          userId: landlordId,
          type: "transfer_confirmation",
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: isSuccess || isPending,
        status: status,
        message: intouchData.message,
        transactionId: intouchData.transaction_id,
        partnerTransactionId: transactionId,
        transfer: transfer,
        pending: isPending,
        netAmount: netAmount,
        fees: totalFees,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[INTOUCH Transfer] Error:", error);

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
