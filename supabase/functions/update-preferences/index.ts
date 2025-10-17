import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PreferencesUpdate {
  userId: string;
  preferences: {
    preferred_cities?: string[];
    preferred_property_types?: string[];
    min_budget?: number;
    max_budget?: number;
    min_bedrooms?: number;
    min_bathrooms?: number;
    requires_furnished?: boolean;
    requires_ac?: boolean;
    requires_parking?: boolean;
    requires_garden?: boolean;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, preferences }: PreferencesUpdate = await req.json();

    // Update or insert preferences
    const { data: updatedPrefs, error: prefsError } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (prefsError) throw prefsError;

    // Invalidate recommendation cache
    const { error: cacheError } = await supabase
      .from('recommendation_cache')
      .delete()
      .eq('user_id', userId);

    if (cacheError) console.error('Cache invalidation error:', cacheError);

    // Trigger new recommendations generation
    const recommendationsResponse = await fetch(
      `${supabaseUrl}/functions/v1/generate-recommendations`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          userId,
          type: 'properties',
          limit: 10,
        }),
      }
    );

    let newRecommendations = [];
    if (recommendationsResponse.ok) {
      newRecommendations = await recommendationsResponse.json();
    }

    return new Response(JSON.stringify({
      success: true,
      preferences: updatedPrefs,
      recommendations: newRecommendations,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
