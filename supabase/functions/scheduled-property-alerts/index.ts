import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface Property {
  id: string;
  title: string;
  city: string;
  property_type: string;
  monthly_rent: number | null;
  price: number | null;
  bedrooms: number | null;
  furnished: boolean | null;
  created_at: string;
  updated_at: string;
  status: string;
}

interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  search_criteria: Record<string, unknown>;
  alert_enabled: boolean;
  alert_frequency: string;
  last_alert_sent_at: string | null;
  total_matches: number;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Créer le client Supabase avec le service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer les paramètres
    const url = new URL(req.url);
    const frequency = url.searchParams.get("frequency") || "hourly"; // hourly, daily, weekly
    const dryRun = url.searchParams.get("dryRun") === "true";

    console.log(`Scheduled property alerts check - Frequency: ${frequency}, DryRun: ${dryRun}`);

    let since: Date;
    const now = new Date();

    // Déterminer la période de vérification selon la fréquence
    switch (frequency) {
      case "hourly":
        since = new Date(now.getTime() - 60 * 60 * 1000); // 1 heure
        break;
      case "daily":
        since = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 heures
        break;
      case "weekly":
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 jours
        break;
      default:
        since = new Date(now.getTime() - 60 * 60 * 1000);
    }

    console.log(`Checking properties since: ${since.toISOString()}`);

    // Étape 1: Récupérer les biens créés/modifiés depuis la période
    const { data: properties, error: propertiesError } = await supabase
      .from("properties")
      .select("*")
      .gte("updated_at", since.toISOString())
      .eq("status", "available")
      .limit(500); // Limite pour éviter les requêtes trop longues

    if (propertiesError) {
      console.error("Error fetching properties:", propertiesError);
      return new Response(
        JSON.stringify({ error: "Error fetching properties", details: propertiesError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const propertiesList = (properties || []) as Property[];
    console.log(`Found ${propertiesList.length} properties to check`);

    if (propertiesList.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          frequency,
          propertiesChecked: 0,
          matches: 0,
          notifications: 0,
          message: "No properties to check"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Étape 2: Récupérer les recherches sauvegardées avec alertes activées
    const { data: savedSearches, error: searchesError } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("alert_enabled", true)
      .eq("is_active", true);

    if (searchesError) {
      console.error("Error fetching saved searches:", searchesError);
      return new Response(
        JSON.stringify({ error: "Error fetching saved searches", details: searchesError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchesList = (savedSearches || []) as SavedSearch[];
    console.log(`Found ${searchesList.length} active saved searches with alerts enabled`);

    // Étape 3: Pour chaque recherche, vérifier si elle doit être traitée selon sa fréquence
    const searchesToProcess = searchesList.filter((search) => {
      if (search.alert_frequency === "immediate") {
        return true; // Toujours vérifier
      }

      if (!search.last_alert_sent_at) {
        return true; // Jamais envoyé, on vérifie
      }

      const lastAlert = new Date(search.last_alert_sent_at);
      const timeSinceLastAlert = now.getTime() - lastAlert.getTime();

      if (search.alert_frequency === "daily") {
        // Vérifier si 24h+ se sont écoulées
        return timeSinceLastAlert >= 24 * 60 * 60 * 1000;
      }

      if (search.alert_frequency === "weekly") {
        // Vérifier si 7 jours+ se sont écoulés
        return timeSinceLastAlert >= 7 * 24 * 60 * 60 * 1000;
      }

      return true;
    });

    console.log(`Processing ${searchesToProcess.length} searches based on frequency`);

    // Étape 4: Initialiser les compteurs
    let totalMatches = 0;
    let totalNotifications = 0;
    const matchResults: Array<{
      searchId: string;
      userId: string;
      searchName: string;
      matchesFound: number;
      properties: Array<{ id: string; title: string; city: string }>;
    }> = [];

    // Étape 5: Pour chaque recherche, trouver les propriétés correspondantes
    for (const search of searchesToProcess) {
      const criteria = search.search_criteria;
      if (!criteria) continue;

      // Trouver les propriétés correspondantes
      const matchingProperties = propertiesList.filter((property) => {
        // Vérifier la ville
        if (criteria.city) {
          const searchCity = String(criteria.city).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const propertyCity = property.city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          if (!propertyCity.includes(searchCity)) return false;
        }

        // Vérifier le type de bien
        if (criteria.property_type && property.property_type !== criteria.property_type) {
          return false;
        }

        // Vérifier le prix
        const price = property.monthly_rent || property.price || 0;
        if (criteria.min_price && price < Number(criteria.min_price)) return false;
        if (criteria.max_price && price > Number(criteria.max_price)) return false;

        // Vérifier les chambres
        const bedrooms = property.bedrooms || 0;
        if (criteria.min_bedrooms && bedrooms < Number(criteria.min_bedrooms)) return false;
        if (criteria.max_bedrooms && bedrooms > Number(criteria.max_bedrooms)) return false;

        // Vérifier si meublé
        if (criteria.furnished !== undefined && property.furnished !== criteria.furnished) {
          return false;
        }

        // Vérifier le balcon
        if (criteria.balcony && !property.has_balcony) return false;

        // Vérifier le parking
        if (criteria.parking && !property.has_parking) return false;

        // Vérifier le jardin
        if (criteria.garden && !property.has_garden) return false;

        return true;
      });

      if (matchingProperties.length === 0) {
        continue;
      }

      console.log(`Search "${search.name}": ${matchingProperties.length} match(es)`);
      totalMatches += matchingProperties.length;

      // Étape 6: Pour les recherches avec fréquence daily/weekly, grouper en un résumé
      if (search.alert_frequency === "daily" || search.alert_frequency === "weekly") {
        // Créer un résumé groupé
        if (!dryRun) {
          const { error: notificationError } = await supabase
            .from("notifications")
            .insert({
              user_id: search.user_id,
              type: search.alert_frequency === "daily" ? "property_match_daily_summary" : "property_match_weekly_summary",
              title: search.alert_frequency === "daily"
                ? `🏠 ${matchingProperties.length} bien(s) correspond(ent) à vos recherches`
                : `🏠 Résumé hebdomadaire - ${matchingProperties.length} bien(s) correspond(ent)`,
              message: `${matchingProperties.length} nouvelle(s) correspondance(s) trouvée(s) pour votre recherche "${search.name}"`,
              data: {
                search_id: search.id,
                search_name: search.name,
                match_count: matchingProperties.length,
                matches_list: matchingProperties.map((p) => ({
                  id: p.id,
                  title: p.title,
                  city: p.city,
                  price: p.monthly_rent || p.price,
                })),
                action_url: "/recherche?saved=" + search.id,
              },
              priority: "normal",
              is_read: false,
              channels: ["email", "in_app"],
            });

          if (!notificationError) {
            totalNotifications++;
            // Mettre à jour les stats de la recherche
            await supabase
              .from("saved_searches")
              .update({
                last_alert_sent_at: new Date().toISOString(),
                total_matches: (search.total_matches || 0) + matchingProperties.length,
              })
              .eq("id", search.id);
          }
        }

        matchResults.push({
          searchId: search.id,
          userId: search.user_id,
          searchName: search.name,
          matchesFound: matchingProperties.length,
          properties: matchingProperties.map((p) => ({ id: p.id, title: p.title, city: p.city })),
        });
        continue;
      }

      // Étape 7: Pour les alertes immédiates, créer une notification par bien
      for (const property of matchingProperties) {
        if (!dryRun) {
          const notificationTitle = `🏠 Un bien correspond à votre recherche "${search.name}"`;
          const notificationMessage = `${property.title} à ${property.city} - ${formatPrice(property.monthly_rent || property.price || 0)}€/mois`;

          const { error: notificationError } = await supabase
            .from("notifications")
            .insert({
              user_id: search.user_id,
              type: "new_property_match",
              title: notificationTitle,
              message: notificationMessage,
              data: {
                property_id: property.id,
                search_id: search.id,
                search_name: search.name,
                property_title: property.title,
                property_city: property.city,
                property_price: property.monthly_rent || property.price,
                action_url: `/biens/${property.id}`,
              },
              priority: "high",
              is_read: false,
              channels: ["in_app", "email", "push"],
            });

          if (!notificationError) {
            totalNotifications++;
          }
        }
      }

      // Mettre à jour les stats de la recherche
      if (!dryRun && matchingProperties.length > 0) {
        await supabase
          .from("saved_searches")
          .update({
            last_alert_sent_at: new Date().toISOString(),
            total_matches: (search.total_matches || 0) + matchingProperties.length,
          })
          .eq("id", search.id);
      }
    }

    console.log(`Scheduled check completed: ${totalMatches} matches, ${totalNotifications} notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        frequency,
        propertiesChecked: propertiesList.length,
        searchesProcessed: searchesToProcess.length,
        matches: totalMatches,
        notifications: totalNotifications,
        dryRun,
        matchResults: matchResults.slice(0, 10), // Limiter les résultats dans la réponse
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in scheduled-property-alerts:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function formatPrice(price: number): string {
  return new Intl.NumberFormat("fr-FR").format(price);
}
