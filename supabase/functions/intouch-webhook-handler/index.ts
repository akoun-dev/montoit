import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyHmacSignature, extractSignature, logWebhookAttempt } from "../_shared/hmac.ts";
import { edgeLogger } from "../_shared/logger.ts";
import type { InTouchWebhookPayload } from "../_shared/types/payment.types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Webhook-Signature, X-InTouch-Signature",
};

const STATUS_MAPPING: Record<string, string> = {
  PENDING: "processing",
  SUCCESS: "completed",
  FAILED: "failed",
  PROCESSING: "processing",
  CANCELLED: "cancelled",
};

function validateWebhookData(data: unknown): data is InTouchWebhookPayload {
  if (!data || typeof data !== "object") {
    return false;
  }

  const webhook = data as Record<string, unknown>;

  return (
    typeof webhook.transaction_id === "string" &&
    typeof webhook.partner_transaction_id === "string" &&
    typeof webhook.status === "string" &&
    typeof webhook.amount === "number" &&
    typeof webhook.phone_number === "string"
  );
}

function getClientIP(req: Request): string | null {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('x-real-ip') || 
         null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const clientIP = getClientIP(req);
  let rawBody = "";
  let webhookData: unknown = null;
  let signature: string | null = null;

  try {
    // 1. Lire le corps brut pour la vérification HMAC
    rawBody = await req.text();
    signature = extractSignature(req);
    
    // 2. Vérifier la signature HMAC
    const webhookSecret = Deno.env.get('WEBHOOK_HMAC_SECRET');

    // Si le secret est configuré, la vérification est obligatoire
    if (webhookSecret) {
      if (!signature) {
        edgeLogger.error('Webhook rejected: Missing signature');
        await logWebhookAttempt(supabaseClient, {
          webhook_type: 'intouch',
          source_ip: clientIP,
          signature_provided: null,
          signature_valid: false,
          payload: {},
          processing_result: 'rejected',
          error_message: 'Missing signature header'
        });
        return new Response(
          JSON.stringify({ error: 'Unauthorized - Missing signature' }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const isValid = await verifyHmacSignature(rawBody, signature, webhookSecret);
      
      if (!isValid) {
        edgeLogger.error('Webhook rejected: Invalid signature');
        await logWebhookAttempt(supabaseClient, {
          webhook_type: 'intouch',
          source_ip: clientIP,
          signature_provided: signature,
          signature_valid: false,
          payload: {},
          processing_result: 'rejected',
          error_message: 'Invalid HMAC signature'
        });
        return new Response(
          JSON.stringify({ error: 'Unauthorized - Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      edgeLogger.info('Webhook signature verified successfully');
    } else {
      edgeLogger.warn('WEBHOOK_HMAC_SECRET not configured - signature verification skipped');
    }

    // 3. Parser le JSON
    webhookData = JSON.parse(rawBody);

    if (!validateWebhookData(webhookData)) {
      await logWebhookAttempt(supabaseClient, {
        webhook_type: 'intouch',
        source_ip: clientIP,
        signature_provided: signature,
        signature_valid: !!webhookSecret,
        payload: webhookData as Record<string, unknown>,
        processing_result: 'failed',
        error_message: 'Invalid webhook data structure'
      });
      return new Response(
        JSON.stringify({ error: "Invalid webhook data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      transaction_id,
      partner_transaction_id,
      status,
      amount,
      phone_number: _phone_number,
      timestamp: _timestamp,
      error_message,
    } = webhookData;

    edgeLogger.info('Processing webhook', {
      transaction_id,
      partner_transaction_id,
      status,
      amount,
    });

    const mappedStatus = STATUS_MAPPING[status] || "processing";

    const { data: existingPayment, error: fetchError } = await supabaseClient
      .from("payments")
      .select("id, status, tenant_id, lease_id")
      .eq("transaction_reference", partner_transaction_id)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Failed to fetch payment: ${fetchError.message}`);
    }

    if (!existingPayment) {
      edgeLogger.error('Payment not found', undefined, { partner_transaction_id });
      await logWebhookAttempt(supabaseClient, {
        webhook_type: 'intouch',
        source_ip: clientIP,
        signature_provided: signature,
        signature_valid: true,
        payload: webhookData as unknown as Record<string, unknown>,
        processing_result: 'failed',
        error_message: 'Payment not found'
      });
      return new Response(
        JSON.stringify({ error: "Payment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingPayment.status === "completed" || existingPayment.status === "failed") {
      edgeLogger.info('Payment already finalized', { partner_transaction_id });
      await logWebhookAttempt(supabaseClient, {
        webhook_type: 'intouch',
        source_ip: clientIP,
        signature_provided: signature,
        signature_valid: true,
        payload: webhookData as unknown as Record<string, unknown>,
        processing_result: 'success',
        error_message: 'Payment already processed (idempotent)'
      });
      return new Response(
        JSON.stringify({ message: "Payment already processed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const updateData: Record<string, unknown> = {
      status: mappedStatus,
      intouch_transaction_id: transaction_id,
      intouch_status: status,
      intouch_callback_data: webhookData,
      updated_at: new Date().toISOString(),
    };

    if (mappedStatus === "completed") {
      updateData.paid_at = new Date().toISOString();
    }

    const { error: updateError } = await supabaseClient
      .from("payments")
      .update(updateData)
      .eq("transaction_reference", partner_transaction_id);

    if (updateError) {
      throw new Error(`Failed to update payment: ${updateError.message}`);
    }

    await supabaseClient.from("mobile_money_transactions").update({
      status: mappedStatus,
      external_transaction_id: transaction_id,
      intouch_response: webhookData,
      updated_at: new Date().toISOString(),
    }).eq("payment_id", partner_transaction_id);

    if (mappedStatus === "completed") {
      edgeLogger.info('Payment completed successfully', { partner_transaction_id });

      const { data: user } = await supabaseClient
        .from("profiles")
        .select("phone")
        .eq("id", existingPayment.tenant_id)
        .maybeSingle();

      if (user?.phone) {
        await supabaseClient.functions.invoke("intouch-sms", {
          body: {
            phoneNumber: user.phone,
            message: `Votre paiement de ${amount.toLocaleString()} FCFA a été confirmé. Merci! Ref: ${partner_transaction_id.substring(0, 16)}`,
            userId: existingPayment.tenant_id,
            type: "payment_confirmation",
          },
        });
      }

      const { data: lease } = await supabaseClient
        .from("leases")
        .select("landlord_id, properties!inner(owner_id)")
        .eq("id", existingPayment.lease_id)
        .maybeSingle();

      const propertiesData = lease?.properties as { owner_id: string }[] | undefined;
      const landlordId = lease?.landlord_id || propertiesData?.[0]?.owner_id;

      if (landlordId) {
        const { data: landlord } = await supabaseClient
          .from("profiles")
          .select("phone, full_name")
          .eq("id", landlordId)
          .maybeSingle();

        if (landlord?.phone) {
          await supabaseClient.functions.invoke("intouch-sms", {
            body: {
              phoneNumber: landlord.phone,
              message: `Paiement reçu: ${amount.toLocaleString()} FCFA. Votre transfert sera effectué sous peu. Ref: ${partner_transaction_id.substring(0, 16)}`,
              userId: landlordId,
              type: "payment_notification",
            },
          });
        }

        const platformFeePercentage = 0.05;
        const providerFeePercentage = 0.015;
        const totalFees = amount * (platformFeePercentage + providerFeePercentage);
        const landlordAmount = amount - totalFees;

        const { data: existingTransfer } = await supabaseClient
          .from("landlord_transfers")
          .select("id")
          .eq("payment_id", existingPayment.id)
          .maybeSingle();

        if (!existingTransfer) {
          const paymentData = existingPayment as { id: string; provider?: string };
          await supabaseClient.from("landlord_transfers").insert({
            payment_id: paymentData.id,
            landlord_id: landlordId,
            amount: amount,
            fees: totalFees,
            net_amount: landlordAmount,
            provider: paymentData.provider || 'unknown',
            phone_number: landlord?.phone || "",
            partner_transaction_id: `MTT_TRANSFER_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            status: "pending",
          });
        }
      }
    } else if (mappedStatus === "failed") {
      edgeLogger.error('Payment failed', undefined, { partner_transaction_id, error_message });

      const { data: user } = await supabaseClient
        .from("profiles")
        .select("phone")
        .eq("id", existingPayment.tenant_id)
        .maybeSingle();

      if (user?.phone) {
        await supabaseClient.functions.invoke("intouch-sms", {
          body: {
            phoneNumber: user.phone,
            message: `Votre paiement a échoué. Veuillez réessayer. Ref: ${partner_transaction_id.substring(0, 16)}`,
            userId: existingPayment.tenant_id,
            type: "payment_failed",
          },
        });
      }
    }

    // Log succès final
    await logWebhookAttempt(supabaseClient, {
      webhook_type: 'intouch',
      source_ip: clientIP,
      signature_provided: signature,
      signature_valid: true,
      payload: webhookData as unknown as Record<string, unknown>,
      processing_result: 'success',
      error_message: null
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Webhook processed successfully",
        status: mappedStatus,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    edgeLogger.error("Webhook processing error", error instanceof Error ? error : undefined);

    // Log erreur
    await logWebhookAttempt(supabaseClient, {
      webhook_type: 'intouch',
      source_ip: clientIP,
      signature_provided: signature,
      signature_valid: false,
      payload: (webhookData as Record<string, unknown>) || {},
      processing_result: 'failed',
      error_message: errorMessage
    });

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
