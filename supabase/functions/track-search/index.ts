import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchTrackingRequest {
  userId: string;
  searchFilters: any;
  resultCount: number;
  clickedProperties?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, searchFilters, resultCount, clickedProperties = [] }: SearchTrackingRequest = await req.json();

    // Insert search history
    const { data, error } = await supabase
      .from('search_history')
      .insert({
        user_id: userId,
        search_filters: searchFilters,
        result_count: resultCount,
        clicked_properties: clickedProperties,
      })
      .select()
      .single();

    if (error) throw error;

    // Auto-update preferences based on frequent searches
    const { data: recentSearches } = await supabase
      .from('search_history')
      .select('search_filters')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentSearches && recentSearches.length >= 5) {
      // Extract common patterns
      const cities = new Set<string>();
      const propertyTypes = new Set<string>();
      let totalMinBudget = 0;
      let totalMaxBudget = 0;
      let budgetCount = 0;

      recentSearches.forEach(search => {
        const filters = search.search_filters;
        if (filters.city) cities.add(filters.city);
        if (filters.propertyType) propertyTypes.add(filters.propertyType);
        if (filters.minRent) {
          totalMinBudget += filters.minRent;
          budgetCount++;
        }
        if (filters.maxRent) {
          totalMaxBudget += filters.maxRent;
        }
      });

      // Update preferences if patterns are clear
      if (cities.size > 0 || propertyTypes.size > 0) {
        const { data: existingPrefs } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId)
          .single();

        const updatedPrefs = {
          user_id: userId,
          preferred_cities: existingPrefs?.preferred_cities || Array.from(cities),
          preferred_property_types: existingPrefs?.preferred_property_types || Array.from(propertyTypes),
          min_budget: budgetCount > 0 ? Math.round(totalMinBudget / budgetCount) : existingPrefs?.min_budget,
          max_budget: budgetCount > 0 ? Math.round(totalMaxBudget / budgetCount) : existingPrefs?.max_budget,
        };

        await supabase
          .from('user_preferences')
          .upsert(updatedPrefs, { onConflict: 'user_id' });

        // Invalidate recommendation cache
        await supabase
          .from('recommendation_cache')
          .delete()
          .eq('user_id', userId);
      }
    }

    return new Response(JSON.stringify({ success: true, data }), {
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
