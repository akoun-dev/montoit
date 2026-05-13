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
  surface_area: number | null;
  furnished: boolean | null;
  has_balcony: boolean | null;
  has_parking: boolean | null;
  has_garden: boolean | null;
  amenities: unknown;
  status: string;
  main_image: string | null;
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

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Créer le client Supabase avec le service role pour bypass RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer l'ID du bien à vérifier (optionnel, fourni pour le trigger)
    const { propertyId } = await req.json();

    let propertiesToCheck: Property[] = [];

    if (propertyId) {
      // Mode trigger : vérifier uniquement le bien créé
      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .select("*")
        .eq("id", propertyId)
        .single();

      if (propertyError || !property) {
        console.error("Erreur récupération propriété:", propertyError);
        return new Response(
          JSON.stringify({ error: "Propriété non trouvée" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      propertiesToCheck = [property as Property];
    } else {
      // Mode cron : vérifier les biens créés/modifiés récemment (dernière heure)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const { data: properties, error: propertiesError } = await supabase
        .from("properties")
        .select("*")
        .gte("created_at", oneHourAgo)
        .eq("status", "available");

      if (propertiesError) {
        console.error("Erreur récupération propriétés:", propertiesError);
        return new Response(
          JSON.stringify({ error: "Erreur récupération propriétés" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      propertiesToCheck = (properties || []) as Property[];
    }

    console.log(`Vérification de ${propertiesToCheck.length} propriété(s)...`);

    let totalMatches = 0;
    let totalNotifications = 0;

    // Pour chaque propriété, trouver les recherches correspondantes
    for (const property of propertiesToCheck) {
      // Récupérer toutes les recherches sauvegardées avec alertes activées
      const { data: savedSearches, error: searchesError } = await supabase
        .from("saved_searches")
        .select("*")
        .eq("alert_enabled", true)
        .eq("is_active", true);

      if (searchesError) {
        console.error("Erreur récupération recherches sauvegardées:", searchesError);
        continue;
      }

      const searches = (savedSearches || []) as SavedSearch[];

      // Filtrer les recherches qui correspondent à cette propriété
      const matchingSearches = searches.filter((search) => {
        const criteria = search.search_criteria;
        if (!criteria) return false;

        // Vérification ville
        if (criteria.city) {
          const searchCity = String(criteria.city).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const propertyCity = property.city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          if (!propertyCity.includes(searchCity)) return false;
        }

        // Vérification type de bien
        if (criteria.property_type && property.property_type !== criteria.property_type) {
          return false;
        }

        // Vérification prix
        const price = property.monthly_rent || property.price || 0;
        if (criteria.min_price && price < Number(criteria.min_price)) return false;
        if (criteria.max_price && price > Number(criteria.max_price)) return false;

        // Vérification chambres
        const bedrooms = property.bedrooms || 0;
        if (criteria.min_bedrooms && bedrooms < Number(criteria.min_bedrooms)) return false;
        if (criteria.max_bedrooms && bedrooms > Number(criteria.max_bedrooms)) return false;

        // Vérification meublé
        if (criteria.furnished !== undefined && property.furnished !== criteria.furnished) {
          return false;
        }

        // Vérification balcon
        if (criteria.balcony && !property.has_balcony) return false;

        // Vérification parking
        if (criteria.parking && !property.has_parking) return false;

        // Vérification jardin
        if (criteria.garden && !property.has_garden) return false;

        return true;
      });

      if (matchingSearches.length === 0) {
        console.log(`Propriété ${property.id} : aucune recherche correspondante`);
        continue;
      }

      console.log(`Propriété ${property.id} : ${matchingSearches.length} recherche(s) correspondante(s)`);
      totalMatches += matchingSearches.length;

      // Pour chaque recherche correspondante, créer une notification
      for (const search of matchingSearches) {
        // Vérifier si une notification a déjà été envoyée récemment pour cette recherche
        const shouldNotify = await shouldSendNotification(search, property.id);

        if (!shouldNotify) {
          console.log(`Notification déjà envoyée récemment pour recherche ${search.id}`);
          continue;
        }

        // Créer la notification
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
              property_image: property.main_image,
              action_url: `/biens/${property.id}`,
            },
            priority: "normal",
            is_read: false,
            channels: ["in_app", "email"],
          });

        if (notificationError) {
          console.error("Erreur création notification:", notificationError);
          continue;
        }

        // Mettre à jour les statistiques de la recherche
        await supabase
          .from("saved_searches")
          .update({
            last_alert_sent_at: new Date().toISOString(),
            total_matches: (search.total_matches || 0) + 1,
          })
          .eq("id", search.id);

        totalNotifications++;
      }
    }

    console.log(`Matching terminé : ${totalMatches} correspondance(s), ${totalNotifications} notification(s) créée(s)`);

    return new Response(
      JSON.stringify({
        success: true,
        propertiesChecked: propertiesToCheck.length,
        matches: totalMatches,
        notifications: totalNotifications,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erreur dans property-alerts-matcher:", error);
    return new Response(
      JSON.stringify({ error: "Erreur interne du serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Vérifie si une notification doit être envoyée en fonction de la fréquence
 */
async function shouldSendNotification(search: SavedSearch, propertyId: string): Promise<boolean> {
  // Pour les alertes immédiates, vérifier si ce bien a déjà été notifié
  if (search.alert_frequency === "immediate") {
    // Vous pouvez ajouter une table de tracking pour éviter les doublons
    return true;
  }

  // Pour les alertes quotidiennes/hebdomadaires, vérifier le last_alert_sent_at
  if (search.last_alert_sent_at) {
    const lastAlert = new Date(search.last_alert_sent_at);
    const now = new Date();

    if (search.alert_frequency === "daily") {
      // Vérifier si 24h se sont écoulées
      const hoursSinceLastAlert = (now.getTime() - lastAlert.getTime()) / (1000 * 60 * 60);
      return hoursSinceLastAlert >= 24;
    }

    if (search.alert_frequency === "weekly") {
      // Vérifier si 7 jours se sont écoulés
      const daysSinceLastAlert = (now.getTime() - lastAlert.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceLastAlert >= 7;
    }
  }

  return true;
}

/**
 * Formate le prix pour l'affichage
 */
function formatPrice(price: number): string {
  return new Intl.NumberFormat("fr-FR").format(price);
}
