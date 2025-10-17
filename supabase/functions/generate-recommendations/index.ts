import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecommendationRequest {
  userId: string;
  type: 'properties' | 'tenants';
  propertyId?: string;
  limit?: number;
}

interface Recommendation {
  id: string;
  score: number;
  reasons: string[];
  type: string;
  data?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { userId, type, propertyId, limit = 10 }: RecommendationRequest = await req.json();

    // Check cache first
    const { data: cached } = await supabase
      .from('recommendation_cache')
      .select('*')
      .eq('user_id', userId)
      .eq('recommendation_type', type)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cached) {
      return new Response(JSON.stringify(cached.recommended_items), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let recommendations: Recommendation[] = [];

    if (type === 'properties') {
      // Get user preferences
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Get search history
      const { data: history } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get favorites
      const { data: favorites } = await supabase
        .from('user_favorites')
        .select('property_id')
        .eq('user_id', userId);

      const favoriteIds = favorites?.map(f => f.property_id) || [];

      // Get all available properties
      const { data: properties } = await supabase
        .from('properties')
        .select('*')
        .eq('status', 'disponible')
        .neq('owner_id', userId);

      if (properties) {
        // Score each property
        for (const property of properties) {
          let score = 0;
          const reasons: string[] = [];

          // Budget matching (40 points)
          if (prefs) {
            if (prefs.min_budget && prefs.max_budget) {
              if (property.monthly_rent >= prefs.min_budget && property.monthly_rent <= prefs.max_budget) {
                score += 40;
                reasons.push('Dans votre budget');
              } else if (Math.abs(property.monthly_rent - prefs.max_budget) / prefs.max_budget < 0.15) {
                score += 20;
                reasons.push('Proche de votre budget');
              }
            }

            // City preference (20 points)
            if (prefs.preferred_cities?.includes(property.city)) {
              score += 20;
              reasons.push('Ville préférée');
            }

            // Property type (15 points)
            if (prefs.preferred_property_types?.includes(property.property_type)) {
              score += 15;
              reasons.push('Type de bien recherché');
            }

            // Bedrooms (10 points)
            if (prefs.min_bedrooms && property.bedrooms >= prefs.min_bedrooms) {
              score += 10;
              reasons.push('Nombre de chambres conforme');
            }

            // Amenities (15 points total)
            if (prefs.requires_furnished && property.is_furnished) {
              score += 5;
              reasons.push('Meublé');
            }
            if (prefs.requires_parking && property.has_parking) {
              score += 5;
              reasons.push('Parking disponible');
            }
            if (prefs.requires_ac && property.has_ac) {
              score += 3;
              reasons.push('Climatisation');
            }
            if (prefs.requires_garden && property.has_garden) {
              score += 2;
              reasons.push('Jardin');
            }
          }

          // Bonus for similar to favorites (10 points)
          if (favoriteIds.length > 0) {
            const { data: similarFavorites } = await supabase
              .from('properties')
              .select('*')
              .in('id', favoriteIds)
              .eq('city', property.city);

            if (similarFavorites && similarFavorites.length > 0) {
              score += 10;
              reasons.push('Similaire à vos favoris');
            }
          }

          if (score > 0) {
            recommendations.push({
              id: property.id,
              score,
              reasons: reasons.slice(0, 3),
              type: 'property',
              data: property
            });
          }
        }
      }
    } else if (type === 'tenants') {
      // For property owners - recommend tenants
      if (!propertyId) {
        throw new Error('propertyId required for tenant recommendations');
      }

      // Get property details
      const { data: property } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (!property) {
        throw new Error('Property not found');
      }

      // Get all applications for this property
      const { data: applications } = await supabase
        .from('rental_applications')
        .select(`
          *,
          profiles:applicant_id (
            id,
            full_name,
            avatar_url,
            oneci_verified,
            cnam_verified,
            face_verified
          ),
          verifications:applicant_id (
            tenant_score,
            cnam_data
          )
        `)
        .eq('property_id', propertyId)
        .eq('status', 'pending');

      if (applications) {
        for (const app of applications) {
          let score = 0;
          const reasons: string[] = [];

          const verification = Array.isArray(app.verifications) ? app.verifications[0] : app.verifications;
          const profile = app.profiles;

          // Tenant score (40 points)
          if (verification?.tenant_score) {
            score += Math.round((verification.tenant_score / 100) * 40);
            if (verification.tenant_score >= 75) {
              reasons.push('Excellent score locataire');
            } else if (verification.tenant_score >= 60) {
              reasons.push('Bon score locataire');
            }
          }

          // Verifications (30 points total)
          if (profile?.oneci_verified) {
            score += 10;
            reasons.push('Identité vérifiée');
          }
          if (profile?.cnam_verified) {
            score += 15;
            reasons.push('Emploi vérifié');
          }
          if (profile?.face_verified) {
            score += 5;
            reasons.push('Biométrie validée');
          }

          // Income to rent ratio (30 points)
          if (verification?.cnam_data?.monthly_salary) {
            const ratio = verification.cnam_data.monthly_salary / property.monthly_rent;
            if (ratio >= 3) {
              score += 30;
              reasons.push('Revenus très confortables');
            } else if (ratio >= 2.5) {
              score += 20;
              reasons.push('Revenus suffisants');
            } else if (ratio >= 2) {
              score += 10;
              reasons.push('Revenus acceptables');
            }
          }

          if (score > 0) {
            recommendations.push({
              id: app.applicant_id,
              score,
              reasons: reasons.slice(0, 3),
              type: 'tenant',
              data: { ...app, profile }
            });
          }
        }
      }
    }

    // Sort by score and limit
    recommendations.sort((a, b) => b.score - a.score);
    recommendations = recommendations.slice(0, limit);

    // Use Lovable AI to enhance reasons if needed
    if (recommendations.length > 0 && recommendations.length <= 5) {
      try {
        const aiPrompt = `En tant qu'expert immobilier, améliore ces raisons de recommandation pour les rendre plus convaincantes et personnalisées. Garde-les courtes (max 6 mots chacune):
${recommendations.map((r, i) => `${i + 1}. ${r.reasons.join(', ')}`).join('\n')}

Retourne uniquement les raisons améliorées, une par ligne, sans numérotation.`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'Tu es un expert immobilier qui aide à formuler des recommandations convaincantes.' },
              { role: 'user', content: aiPrompt }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const enhancedReasons = aiData.choices[0].message.content.split('\n').filter((r: string) => r.trim());
          
          recommendations.forEach((rec, idx) => {
            if (enhancedReasons[idx]) {
              rec.reasons = [enhancedReasons[idx]];
            }
          });
        }
      } catch (aiError) {
        console.error('AI enhancement failed:', aiError);
        // Continue with original reasons
      }
    }

    // Cache results
    await supabase.from('recommendation_cache').upsert({
      user_id: userId,
      recommendation_type: type,
      recommended_items: recommendations,
      expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
    }, { onConflict: 'user_id,recommendation_type' });

    return new Response(JSON.stringify(recommendations), {
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
