import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FeatureFlag {
  id?: string;
  key: string;
  name: string;
  description?: string;
  category: string;
  is_enabled: boolean;
  requires_credentials: boolean;
  credentials_status: "not_configured" | "sandbox" | "production";
  rollout_percentage?: number;
  allowed_roles?: string[];
  metadata?: Record<string, any>;
}

interface FeatureFlagOverride {
  feature_flag_id: string;
  user_id: string;
  is_enabled: boolean;
  reason?: string;
  expires_at?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Vérifier que l'utilisateur est admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_role_assignments")
      .select("role_id, user_roles(name)")
      .eq("user_id", user.id)
      .single();

    const userRoles = roleData?.user_roles as { name: string } | { name: string }[] | undefined;
    const roleName = Array.isArray(userRoles) ? userRoles[0]?.name : userRoles?.name;
    if (
      roleError ||
      !roleData ||
      roleName !== "admin"
    ) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    // GET /manage-feature-flags - Liste tous les flags
    if (req.method === "GET" && !path) {
      const category = url.searchParams.get("category");
      const enabled = url.searchParams.get("enabled");

      let query = supabaseClient
        .from("feature_flags")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (category) {
        query = query.eq("category", category);
      }

      if (enabled !== null) {
        query = query.eq("is_enabled", enabled === "true");
      }

      const { data, error } = await query;

      if (error) throw error;

      return new Response(JSON.stringify({ flags: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /manage-feature-flags/{key} - Récupère un flag spécifique
    if (req.method === "GET" && path) {
      const { data, error } = await supabaseClient
        .from("feature_flags")
        .select("*")
        .eq("key", path)
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /manage-feature-flags - Crée un nouveau flag
    if (req.method === "POST") {
      const body: FeatureFlag = await req.json();

      const { data, error } = await supabaseClient
        .from("feature_flags")
        .insert({
          ...body,
          created_by: user.id,
          updated_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PUT /manage-feature-flags/{key} - Met à jour un flag
    if (req.method === "PUT" && path) {
      const body: Partial<FeatureFlag> = await req.json();

      const { data, error } = await supabaseClient
        .from("feature_flags")
        .update({
          ...body,
          updated_by: user.id,
        })
        .eq("key", path)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE /manage-feature-flags/{key} - Supprime un flag
    if (req.method === "DELETE" && path) {
      const { error } = await supabaseClient
        .from("feature_flags")
        .delete()
        .eq("key", path);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /manage-feature-flags/{key}/toggle - Active/désactive un flag
    if (req.method === "POST" && path && url.pathname.includes("/toggle")) {
      const flagKey = path.replace("/toggle", "");

      // Récupérer l'état actuel
      const { data: currentFlag, error: fetchError } = await supabaseClient
        .from("feature_flags")
        .select("is_enabled")
        .eq("key", flagKey)
        .single();

      if (fetchError) throw fetchError;

      // Inverser l'état
      const { data, error } = await supabaseClient
        .from("feature_flags")
        .update({
          is_enabled: !currentFlag.is_enabled,
          updated_by: user.id,
        })
        .eq("key", flagKey)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /manage-feature-flags/{key}/override - Crée un override pour un utilisateur
    if (req.method === "POST" && path && url.pathname.includes("/override")) {
      const flagKey = path.replace("/override", "");
      const body: FeatureFlagOverride = await req.json();

      // Récupérer l'ID du flag
      const { data: flag, error: flagError } = await supabaseClient
        .from("feature_flags")
        .select("id")
        .eq("key", flagKey)
        .single();

      if (flagError) throw flagError;

      const { data, error } = await supabaseClient
        .from("feature_flag_overrides")
        .insert({
          feature_flag_id: flag.id,
          user_id: body.user_id,
          is_enabled: body.is_enabled,
          reason: body.reason,
          expires_at: body.expires_at,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /manage-feature-flags/{key}/history - Récupère l'historique d'un flag
    if (req.method === "GET" && path && url.pathname.includes("/history")) {
      const flagKey = path.replace("/history", "");

      // Récupérer l'ID du flag
      const { data: flag, error: flagError } = await supabaseClient
        .from("feature_flags")
        .select("id")
        .eq("key", flagKey)
        .single();

      if (flagError) throw flagError;

      const { data, error } = await supabaseClient
        .from("feature_flag_history")
        .select("*, profiles(email)")
        .eq("feature_flag_id", flag.id)
        .order("changed_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      return new Response(JSON.stringify({ history: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /manage-feature-flags/categories - Liste toutes les catégories
    if (req.method === "GET" && url.pathname.includes("/categories")) {
      const { data, error } = await supabaseClient
        .from("feature_flags")
        .select("category")
        .order("category");

      if (error) throw error;

      const categories = [...new Set(data.map((f) => f.category))];

      return new Response(JSON.stringify({ categories }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in manage-feature-flags:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

