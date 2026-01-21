import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { userId, limit = 10 } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: activity, error: activityError } = await supabase
      .from("user_activity_tracking")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (activityError) throw activityError;

    const { data: favorites, error: favoritesError } = await supabase
      .from("property_favorites")
      .select("property_id")
      .eq("user_id", userId);

    if (favoritesError) throw favoritesError;

    const favoriteIds = favorites?.map((f) => f.property_id) || [];

    const { data: properties, error: propertiesError } = await supabase
      .from("properties")
      .select("*")
      .eq("status", "disponible")
      .limit(100);

    if (propertiesError) throw propertiesError;

    const scores = [];

    for (const property of properties || []) {
      let score = 0;
      const reasons = [];

      if (favoriteIds.includes(property.id)) {
        score += 40;
        reasons.push("Similaire à vos favoris");
      }

      const viewedCities = activity
        ?.filter((a) => a.action_type === "view")
        .map((a) => a.action_data?.city)
        .filter(Boolean) || [];

      if (viewedCities.includes(property.city)) {
        score += 25;
        reasons.push(`Ville préférée: ${property.city}`);
      }

      const searchActivity = activity?.filter((a) =>
        a.action_type === "search"
      );
      if (searchActivity && searchActivity.length > 0) {
        const lastSearch = searchActivity[0];
        const criteria = lastSearch.action_data || {};

        if (
          criteria.property_type &&
          property.property_type === criteria.property_type
        ) {
          score += 20;
          reasons.push("Correspond à votre recherche");
        }

        if (criteria.min_price && criteria.max_price) {
          const inRange =
            property.monthly_rent >= criteria.min_price &&
            property.monthly_rent <= criteria.max_price;
          if (inRange) {
            score += 15;
            reasons.push("Dans votre budget");
          }
        }
      }

      const popularityScore = Math.min(property.view_count * 0.1, 20);
      score += popularityScore;
      if (popularityScore > 10) {
        reasons.push("Populaire auprès des locataires");
      }

      const daysOld = Math.floor(
        (Date.now() - new Date(property.created_at).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const freshnessScore = Math.max(10 - daysOld, 0);
      score += freshnessScore;
      if (freshnessScore > 5) {
        reasons.push("Annonce récente");
      }

      if (score > 0) {
        scores.push({
          propertyId: property.id,
          property,
          score: Math.min(score, 100),
          reason: reasons.join(", "),
          algorithm: "hybrid",
        });
      }
    }

    scores.sort((a, b) => b.score - a.score);
    const topRecommendations = scores.slice(0, limit);

    const recommendationsToStore = topRecommendations.map((rec) => ({
      user_id: userId,
      property_id: rec.propertyId,
      recommendation_score: rec.score,
      recommendation_reason: rec.reason,
      algorithm_type: rec.algorithm,
    }));

    if (recommendationsToStore.length > 0) {
      await supabase
        .from("ai_recommendations")
        .insert(recommendationsToStore);
    }

    await supabase.from("ai_usage_logs").insert({
      user_id: userId,
      service_type: "recommendations",
      operation: "personalized_recommendations",
      tokens_used: 0,
      cost_fcfa: 0.5,
      success: true,
      metadata: {
        recommendations_count: limit,
        algorithm: "hybrid",
      },
    });

    return new Response(
      JSON.stringify({
        recommendations: topRecommendations.map((r) => ({
          property: r.property,
          score: r.score,
          reason: r.reason,
        })),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in ai-recommendations function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
