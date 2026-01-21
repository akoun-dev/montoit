import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PropertyAlert {
  id: string;
  user_id: string;
  alert_type: string;
  search_criteria: any;
  email_enabled: boolean;
  push_enabled: boolean;
  last_triggered_at: string | null;
  trigger_count: number;
}

interface Property {
  id: string;
  title: string;
  city: string;
  neighborhood: string;
  monthly_rent: number;
  bedrooms: number;
  bathrooms: number;
  surface_area: number;
  property_type: string;
  main_image: string;
  created_at: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("🔍 Checking property alerts...");

    // 1. Récupérer toutes les alertes actives
    const { data: alerts, error: alertsError } = await supabase
      .from("property_alerts")
      .select("*")
      .eq("is_active", true)
      .eq("alert_type", "new_similar");

    if (alertsError) throw alertsError;

    console.log(`Found ${alerts?.length || 0} active alerts`);

    const results = [];

    for (const alert of alerts || []) {
      try {
        // 2. Trouver les nouveaux biens depuis la dernière vérification
        const lastCheck = alert.last_triggered_at || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        let query = supabase
          .from("properties")
          .select("*")
          .eq("moderation_status", "approved")
          .gt("created_at", lastCheck);

        // 3. Appliquer les critères de recherche
        const criteria = alert.search_criteria || {};
        
        if (criteria.city) {
          query = query.eq("city", criteria.city);
        }
        if (criteria.property_type) {
          query = query.eq("property_type", criteria.property_type);
        }
        if (criteria.min_rent) {
          query = query.gte("monthly_rent", criteria.min_rent);
        }
        if (criteria.max_rent) {
          query = query.lte("monthly_rent", criteria.max_rent);
        }
        if (criteria.min_bedrooms) {
          query = query.gte("bedrooms", criteria.min_bedrooms);
        }

        const { data: newProperties, error: propertiesError } = await query;

        if (propertiesError) throw propertiesError;

        console.log(`Found ${newProperties?.length || 0} new properties for alert ${alert.id}`);

        // 4. Envoyer les notifications pour chaque nouveau bien
        for (const property of newProperties || []) {
          // Récupérer le profil utilisateur
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", alert.user_id)
            .single();

          const { data: { user } } = await supabase.auth.admin.getUserById(alert.user_id);
          const userEmail = user?.email;

          if (!userEmail || !profile) continue;

          // Déterminer les critères correspondants
          const matchCriteria = [];
          if (criteria.city === property.city) matchCriteria.push(`Ville: ${property.city}`);
          if (criteria.property_type === property.property_type) matchCriteria.push(`Type: ${property.property_type}`);
          if (criteria.min_bedrooms && property.bedrooms >= criteria.min_bedrooms) {
            matchCriteria.push(`${property.bedrooms}+ chambres`);
          }

          // Notification in-app
          await supabase.from("notifications").insert({
            user_id: alert.user_id,
            type: "new_similar_property",
            category: "property_alerts",
            title: "🏠 Nouveau bien correspond à vos critères",
            message: `${property.title} à ${property.city} - ${property.monthly_rent.toLocaleString()} FCFA/mois`,
            link: `/propriete/${property.id}`,
            metadata: {
              property_id: property.id,
              alert_id: alert.id,
            },
          });

          // Email notification (si activé)
          if (alert.email_enabled) {
            const frontendUrl = Deno.env.get("FRONTEND_URL") || supabaseUrl.replace("supabase.co", "lovable.app");
            
            await supabase.functions.invoke("send-email", {
              body: {
                to: userEmail,
                subject: `🏠 Nouveau bien à ${property.city} correspond à vos critères`,
                template: "new-similar-property",
                data: {
                  userName: profile.full_name,
                  property: {
                    id: property.id,
                    title: property.title,
                    city: property.city,
                    neighborhood: property.neighborhood || property.city,
                    monthly_rent: property.monthly_rent,
                    bedrooms: property.bedrooms,
                    surface_area: property.surface_area,
                    main_image: property.main_image,
                  },
                  matchCriteria,
                  propertyUrl: `${frontendUrl}/propriete/${property.id}`,
                },
              },
            });
          }

          // Logger dans alert_history
          await supabase.from("alert_history").insert({
            alert_id: alert.id,
            user_id: alert.user_id,
            property_id: property.id,
            alert_type: "new_similar",
            delivery_method: alert.email_enabled ? "email" : "in_app",
            alert_data: { property, criteria },
            delivery_status: "sent",
          });
        }

        // 5. Mettre à jour last_triggered_at et trigger_count
        await supabase
          .from("property_alerts")
          .update({
            last_triggered_at: new Date().toISOString(),
            trigger_count: alert.trigger_count + (newProperties?.length || 0),
          })
          .eq("id", alert.id);

        results.push({
          alert_id: alert.id,
          properties_found: newProperties?.length || 0,
          notifications_sent: newProperties?.length || 0,
        });
      } catch (error) {
        console.error(`Error processing alert ${alert.id}:`, error);
        results.push({
          alert_id: alert.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    console.log("✅ Property alerts check completed");

    return new Response(
      JSON.stringify({
        success: true,
        alerts_processed: alerts?.length || 0,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in check-property-alerts:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
