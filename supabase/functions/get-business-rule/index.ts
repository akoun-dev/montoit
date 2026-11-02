import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BusinessRule {
  rule_key: string;
  category: string;
  rule_name: string;
  rule_type: "number" | "boolean" | "percentage" | "json";
  value_number: number | null;
  value_boolean: boolean | null;
  value_json: Record<string, unknown> | null;
  description: string | null;
  is_enabled: boolean;
  min_value: number | null;
  max_value: number | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const ruleKey = url.searchParams.get("key");
    const category = url.searchParams.get("category");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get single rule by key
    if (ruleKey) {
      console.log(`[get-business-rule] Fetching rule: ${ruleKey}`);

      const { data, error } = await supabase
        .from("business_rules")
        .select("*")
        .eq("rule_key", ruleKey)
        .eq("is_enabled", true)
        .maybeSingle();

      if (error) {
        console.error(`[get-business-rule] Error:`, error);
        throw error;
      }

      if (!data) {
        return new Response(
          JSON.stringify({ error: "Rule not found", key: ruleKey }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Return simplified value based on type
      const rule = data as BusinessRule;
      const value = rule.rule_type === "boolean" 
        ? rule.value_boolean 
        : rule.rule_type === "json" 
          ? rule.value_json 
          : rule.value_number;

      return new Response(
        JSON.stringify({
          key: rule.rule_key,
          name: rule.rule_name,
          category: rule.category,
          type: rule.rule_type,
          value,
          description: rule.description,
          isEnabled: rule.is_enabled,
          minValue: rule.min_value,
          maxValue: rule.max_value,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get rules by category
    if (category) {
      console.log(`[get-business-rule] Fetching category: ${category}`);

      const { data, error } = await supabase
        .from("business_rules")
        .select("*")
        .eq("category", category)
        .eq("is_enabled", true)
        .order("rule_name");

      if (error) {
        console.error(`[get-business-rule] Error:`, error);
        throw error;
      }

      const rules = (data as BusinessRule[]).map((rule) => ({
        key: rule.rule_key,
        name: rule.rule_name,
        category: rule.category,
        type: rule.rule_type,
        value: rule.rule_type === "boolean" 
          ? rule.value_boolean 
          : rule.rule_type === "json" 
            ? rule.value_json 
            : rule.value_number,
        description: rule.description,
        isEnabled: rule.is_enabled,
        minValue: rule.min_value,
        maxValue: rule.max_value,
      }));

      return new Response(
        JSON.stringify({ rules, category }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all rules grouped by category
    console.log(`[get-business-rule] Fetching all rules`);

    const { data, error } = await supabase
      .from("business_rules")
      .select("*")
      .eq("is_enabled", true)
      .order("category")
      .order("rule_name");

    if (error) {
      console.error(`[get-business-rule] Error:`, error);
      throw error;
    }

    // Group by category
    const grouped: Record<string, unknown[]> = {};
    for (const rule of data as BusinessRule[]) {
      if (!grouped[rule.category]) {
        grouped[rule.category] = [];
      }
      grouped[rule.category].push({
        key: rule.rule_key,
        name: rule.rule_name,
        type: rule.rule_type,
        value: rule.rule_type === "boolean" 
          ? rule.value_boolean 
          : rule.rule_type === "json" 
            ? rule.value_json 
            : rule.value_number,
        description: rule.description,
        minValue: rule.min_value,
        maxValue: rule.max_value,
      });
    }

    return new Response(
      JSON.stringify({ rules: grouped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[get-business-rule] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
