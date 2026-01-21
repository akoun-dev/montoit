import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    // Récupérer l'utilisateur (optionnel)
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    const url = new URL(req.url);
    const flagKey = url.searchParams.get("key");

    if (!flagKey) {
      return new Response(
        JSON.stringify({ error: "Missing 'key' parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Utiliser la fonction SQL pour vérifier le flag
    const { data, error } = await supabaseClient.rpc("check_feature_flag", {
      flag_key: flagKey,
      user_id: user?.id || null,
    });

    if (error) {
      // Si la fonction n'existe pas en local, on désactive proprement le flag au lieu d'une 500
      const isMissingFn =
        (error as any)?.code === "PGRST202" ||
        (error as any)?.message?.includes("Could not find the function");

      if (isMissingFn) {
        console.warn("check_feature_flag RPC missing, returning false by default");
        return new Response(
          JSON.stringify({
            key: flagKey,
            enabled: false,
            user_id: user?.id || null,
            warning: "RPC check_feature_flag manquante",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      throw error;
    }

    return new Response(
      JSON.stringify({
        key: flagKey,
        enabled: data,
        user_id: user?.id || null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in check-feature-flag:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
