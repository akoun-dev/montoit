import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarketTrend {
  city: string;
  avg_price_per_sqm: number;
  total_properties: number;
  avg_rent: number;
  trend_percentage: number;
  similar_cheaper_cities: string[];
  avg_rental_days: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      authHeader ? {
        global: {
          headers: { Authorization: authHeader },
        },
      } : {}
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    console.log('Analyzing market trends', user ? `for user: ${user.id}` : '(anonymous)');

    // Villes par défaut pour les utilisateurs anonymes
    const DEFAULT_CITIES = ['Abidjan', 'Yamoussoukro', 'Bouaké', 'San-Pédro', 'Korhogo'];
    const searchedCities = new Set<string>();

    if (user) {
      // Utilisateur authentifié : utiliser son historique de recherche
      const { data: searchHistory, error: searchError } = await supabaseClient
        .from('search_history')
        .select('search_params')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (searchError) {
        console.error('Error fetching search history:', searchError);
      }

      // Extraire les villes recherchées
      searchHistory?.forEach((search: any) => {
        const params = search.search_params;
        if (params?.city) {
          searchedCities.add(params.city);
        }
      });

      if (searchedCities.size === 0) {
        // Pas d'historique, utiliser les villes par défaut
        DEFAULT_CITIES.forEach(city => searchedCities.add(city));
      }
    } else {
      // Utilisateur anonyme : utiliser les villes populaires
      DEFAULT_CITIES.forEach(city => searchedCities.add(city));
    }

    console.log('Cities to analyze:', Array.from(searchedCities));

    // Analyser les propriétés pour chaque ville
    const trends: MarketTrend[] = [];

    for (const city of searchedCities) {
      // Propriétés actuelles
      const { data: currentProps, error: currentError } = await supabaseClient
        .from('properties')
        .select('monthly_rent, surface_area, created_at, status')
        .eq('city', city)
        .eq('moderation_status', 'approved')
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

      if (currentError) {
        console.error('Error fetching current properties:', currentError);
        continue;
      }

      // Propriétés anciennes (pour calculer la tendance)
      const { data: oldProps, error: oldError } = await supabaseClient
        .from('properties')
        .select('monthly_rent, surface_area')
        .eq('city', city)
        .eq('moderation_status', 'approved')
        .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString());

      if (oldError) {
        console.error('Error fetching old properties:', oldError);
      }

      if (!currentProps || currentProps.length === 0) {
        continue;
      }

      // Calculer le prix moyen au m²
      const propsWithArea = currentProps.filter(
        (p: any) => p.surface_area && p.surface_area > 0
      );
      const avgPricePerSqm =
        propsWithArea.length > 0
          ? propsWithArea.reduce((sum: number, p: any) => sum + p.monthly_rent / p.surface_area, 0) /
            propsWithArea.length
          : 0;

      // Calculer le loyer moyen
      const avgRent =
        currentProps.reduce((sum: number, p: any) => sum + (p.monthly_rent || 0), 0) /
        currentProps.length;

      // Calculer la tendance (comparaison avec période précédente)
      let trendPercentage = 0;
      if (oldProps && oldProps.length > 0) {
        const oldAvgRent =
          oldProps.reduce((sum: number, p: any) => sum + (p.monthly_rent || 0), 0) / oldProps.length;
        if (oldAvgRent > 0) {
          trendPercentage = ((avgRent - oldAvgRent) / oldAvgRent) * 100;
        }
      }

      // Estimer le délai moyen de location (basé sur les propriétés louées récemment)
      const { data: rentedProps, error: rentedError } = await supabaseClient
        .from('properties')
        .select('created_at, updated_at')
        .eq('city', city)
        .eq('status', 'loué')
        .gte('updated_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .limit(20);

      let avgRentalDays = 15; // Valeur par défaut
      if (rentedProps && rentedProps.length > 0) {
        const rentalDays = rentedProps.map((p: any) => {
          const created = new Date(p.created_at).getTime();
          const updated = new Date(p.updated_at).getTime();
          return Math.floor((updated - created) / (1000 * 60 * 60 * 24));
        });
        avgRentalDays = Math.floor(
          rentalDays.reduce((sum, days) => sum + days, 0) / rentalDays.length
        );
      }

      trends.push({
        city,
        avg_price_per_sqm: Math.round(avgPricePerSqm),
        total_properties: currentProps.length,
        avg_rent: Math.round(avgRent),
        trend_percentage: Math.round(trendPercentage * 10) / 10,
        similar_cheaper_cities: [],
        avg_rental_days: avgRentalDays,
      });
    }

    // Trouver des villes similaires mais moins chères
    for (const trend of trends) {
      const { data: allCities, error: citiesError } = await supabaseClient
        .from('properties')
        .select('city, monthly_rent')
        .neq('city', trend.city)
        .eq('moderation_status', 'approved')
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

      if (!citiesError && allCities) {
        const cityAvgs = new Map<string, number[]>();
        allCities.forEach((prop: any) => {
          if (!cityAvgs.has(prop.city)) {
            cityAvgs.set(prop.city, []);
          }
          cityAvgs.get(prop.city)!.push(prop.monthly_rent);
        });

        const cheaperCities = Array.from(cityAvgs.entries())
          .map(([city, rents]) => ({
            city,
            avgRent: rents.reduce((a, b) => a + b, 0) / rents.length,
          }))
          .filter((c) => c.avgRent < trend.avg_rent && c.avgRent > trend.avg_rent * 0.7)
          .sort((a, b) => a.avgRent - b.avgRent)
          .slice(0, 3)
          .map((c) => c.city);

        trend.similar_cheaper_cities = cheaperCities;
      }
    }

    console.log('Market trends calculated:', trends);

    return new Response(
      JSON.stringify({
        trends,
        generated_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in analyze-market-trends:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Une erreur est survenue' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
