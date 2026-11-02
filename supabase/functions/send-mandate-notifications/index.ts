import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type MandateNotificationType =
  | "mandate_created"
  | "mandate_accepted"
  | "mandate_refused"
  | "mandate_suspended"
  | "mandate_reactivated"
  | "mandate_terminated"
  | "mandate_permissions_updated";

interface NotificationRequest {
  mandateId: string;
  type: MandateNotificationType;
  reason?: string;
  terminatedBy?: "owner" | "agency";
}

interface NotificationConfig {
  title: string;
  getMessage: (data: MandateData) => string;
  recipient: "owner" | "agency" | "both";
  actionUrl: (mandateId: string) => string;
  notificationType: string;
}

interface MandateData {
  id: string;
  property_id: string;
  agency_id: string;
  owner_id: string;
  status: string;
  commission_rate: number;
  property_title: string;
  property_city: string;
  agency_name: string;
  agency_user_id: string;
  owner_name: string;
  owner_email: string;
  agency_email: string;
  reason?: string;
  terminatedBy?: string;
}

const notificationConfigs: Record<MandateNotificationType, NotificationConfig> = {
  mandate_created: {
    title: "🤝 Nouvelle invitation de mandat",
    getMessage: (data) =>
      `${data.owner_name} vous invite à gérer "${data.property_title}" à ${data.property_city}`,
    recipient: "agency",
    actionUrl: (id) => `/mandat/${id}`,
    notificationType: "mandat",
  },
  mandate_accepted: {
    title: "✅ Mandat accepté",
    getMessage: (data) =>
      `L'agence ${data.agency_name} a accepté de gérer votre propriété "${data.property_title}"`,
    recipient: "owner",
    actionUrl: (id) => `/mandat/${id}`,
    notificationType: "mandat",
  },
  mandate_refused: {
    title: "❌ Mandat refusé",
    getMessage: (data) =>
      `L'agence ${data.agency_name} a décliné votre invitation pour "${data.property_title}"${data.reason ? `. Raison: ${data.reason}` : ""}`,
    recipient: "owner",
    actionUrl: () => `/mes-mandats`,
    notificationType: "mandat",
  },
  mandate_suspended: {
    title: "⏸️ Mandat suspendu",
    getMessage: (data) =>
      `La gestion de "${data.property_title}" par ${data.agency_name} a été temporairement suspendue${data.reason ? `. Raison: ${data.reason}` : ""}`,
    recipient: "owner",
    actionUrl: (id) => `/mandat/${id}`,
    notificationType: "mandat",
  },
  mandate_reactivated: {
    title: "▶️ Mandat réactivé",
    getMessage: (data) =>
      `La gestion de "${data.property_title}" par ${data.agency_name} a été réactivée`,
    recipient: "owner",
    actionUrl: (id) => `/mandat/${id}`,
    notificationType: "mandat",
  },
  mandate_terminated: {
    title: "🚫 Mandat résilié",
    getMessage: (data) => {
      const by = data.terminatedBy === "owner" ? data.owner_name : data.agency_name;
      return `Le mandat de gestion pour "${data.property_title}" a été résilié par ${by}${data.reason ? `. Raison: ${data.reason}` : ""}`;
    },
    recipient: "both",
    actionUrl: () => `/mes-mandats`,
    notificationType: "mandat",
  },
  mandate_permissions_updated: {
    title: "⚙️ Permissions modifiées",
    getMessage: (data) =>
      `Les permissions pour la gestion de "${data.property_title}" ont été modifiées par ${data.owner_name}`,
    recipient: "agency",
    actionUrl: (id) => `/mandat/${id}`,
    notificationType: "mandat",
  },
};

// deno-lint-ignore no-explicit-any
async function createInAppNotification(
  supabase: any,
  userId: string,
  title: string,
  message: string,
  actionUrl: string,
  type: string
): Promise<void> {
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    title,
    message,
    action_url: actionUrl,
    type,
    is_read: false,
  });

  if (error) {
    console.error("[send-mandate-notifications] Error creating notification:", error);
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { mandateId, type, reason, terminatedBy }: NotificationRequest = await req.json();

    console.log(`[send-mandate-notifications] Processing ${type} for mandate ${mandateId}`);

    // Fetch mandate with joined data
    const { data: mandate, error: mandateError } = await supabase
      .from("agency_mandates")
      .select(`
        id,
        property_id,
        agency_id,
        owner_id,
        status,
        commission_rate,
        property:properties(title, city),
        agency:agencies(agency_name, user_id, email)
      `)
      .eq("id", mandateId)
      .single();

    if (mandateError || !mandate) {
      console.error("[send-mandate-notifications] Mandate not found:", mandateError);
      return new Response(
        JSON.stringify({ error: "Mandate not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract nested data safely
    // deno-lint-ignore no-explicit-any
    const property = Array.isArray(mandate.property) ? mandate.property[0] : mandate.property as any;
    // deno-lint-ignore no-explicit-any
    const agency = Array.isArray(mandate.agency) ? mandate.agency[0] : mandate.agency as any;

    // Fetch owner profile
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", mandate.owner_id)
      .single();

    // Build mandate data
    const mandateData: MandateData = {
      id: mandate.id,
      property_id: mandate.property_id,
      agency_id: mandate.agency_id,
      owner_id: mandate.owner_id,
      status: mandate.status,
      commission_rate: mandate.commission_rate,
      property_title: property?.title || "Propriété",
      property_city: property?.city || "",
      agency_name: agency?.agency_name || "Agence",
      agency_user_id: agency?.user_id || "",
      agency_email: agency?.email || "",
      owner_name: ownerProfile?.full_name || "Propriétaire",
      owner_email: ownerProfile?.email || "",
      reason,
      terminatedBy,
    };

    const config = notificationConfigs[type];
    if (!config) {
      console.error("[send-mandate-notifications] Unknown notification type:", type);
      return new Response(
        JSON.stringify({ error: "Unknown notification type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const title = config.title;
    const message = config.getMessage(mandateData);
    const actionUrl = config.actionUrl(mandateId);

    // Determine recipients
    const recipients: string[] = [];
    if (config.recipient === "owner" || config.recipient === "both") {
      recipients.push(mandate.owner_id);
    }
    if (config.recipient === "agency" || config.recipient === "both") {
      if (mandateData.agency_user_id) {
        recipients.push(mandateData.agency_user_id);
      }
    }

    // Create in-app notifications for all recipients
    for (const recipientId of recipients) {
      await createInAppNotification(
        supabase,
        recipientId,
        title,
        message,
        actionUrl,
        config.notificationType
      );
    }

    console.log(`[send-mandate-notifications] Created ${recipients.length} notification(s) for ${type}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent: recipients.length,
        type 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[send-mandate-notifications] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
