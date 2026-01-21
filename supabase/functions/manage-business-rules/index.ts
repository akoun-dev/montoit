import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get auth header for user verification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to verify admin role
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is admin
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: hasAdminRole } = await supabaseUser.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!hasAdminRole) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for mutations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle GET - list all rules (including disabled)
    if (req.method === "GET") {
      const url = new URL(req.url);
      const category = url.searchParams.get("category");

      let query = supabase
        .from("business_rules")
        .select("*")
        .order("category")
        .order("rule_name");

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await query;

      if (error) throw error;

      console.log(`[manage-business-rules] Listed ${data.length} rules`);

      return new Response(
        JSON.stringify({ rules: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle PUT - update rule value
    if (req.method === "PUT") {
      const body = await req.json();
      const { key, value, is_enabled } = body;

      if (!key) {
        return new Response(
          JSON.stringify({ error: "Rule key is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get current rule to determine type
      const { data: currentRule, error: fetchError } = await supabase
        .from("business_rules")
        .select("*")
        .eq("rule_key", key)
        .single();

      if (fetchError || !currentRule) {
        return new Response(
          JSON.stringify({ error: "Rule not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate value against min/max
      if (value !== undefined && currentRule.rule_type !== "boolean" && currentRule.rule_type !== "json") {
        const numValue = Number(value);
        if (currentRule.min_value !== null && numValue < currentRule.min_value) {
          return new Response(
            JSON.stringify({ error: `Value must be at least ${currentRule.min_value}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (currentRule.max_value !== null && numValue > currentRule.max_value) {
          return new Response(
            JSON.stringify({ error: `Value must be at most ${currentRule.max_value}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Prepare update
      const updateData: Record<string, unknown> = {};

      if (value !== undefined) {
        if (currentRule.rule_type === "boolean") {
          updateData.value_boolean = Boolean(value);
        } else if (currentRule.rule_type === "json") {
          updateData.value_json = value;
        } else {
          updateData.value_number = Number(value);
        }
      }

      if (is_enabled !== undefined) {
        updateData.is_enabled = Boolean(is_enabled);
      }

      const { data, error } = await supabase
        .from("business_rules")
        .update(updateData)
        .eq("rule_key", key)
        .select()
        .single();

      if (error) throw error;

      // Log the change
      await supabase.rpc("log_admin_action", {
        p_action: "UPDATE_BUSINESS_RULE",
        p_entity_type: "business_rule",
        p_entity_id: key,
        p_details: { previous: currentRule, updated: data },
      });

      console.log(`[manage-business-rules] Updated rule: ${key}`);

      return new Response(
        JSON.stringify({ success: true, rule: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle PATCH - toggle enabled status
    if (req.method === "PATCH") {
      const body = await req.json();
      const { key, is_enabled } = body;

      if (!key || is_enabled === undefined) {
        return new Response(
          JSON.stringify({ error: "Key and is_enabled required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("business_rules")
        .update({ is_enabled: Boolean(is_enabled) })
        .eq("rule_key", key)
        .select()
        .single();

      if (error) throw error;

      // Log the change
      await supabase.rpc("log_admin_action", {
        p_action: is_enabled ? "ENABLE_BUSINESS_RULE" : "DISABLE_BUSINESS_RULE",
        p_entity_type: "business_rule",
        p_entity_id: key,
        p_details: { is_enabled },
      });

      console.log(`[manage-business-rules] Toggled rule: ${key} -> ${is_enabled}`);

      return new Response(
        JSON.stringify({ success: true, rule: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[manage-business-rules] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
