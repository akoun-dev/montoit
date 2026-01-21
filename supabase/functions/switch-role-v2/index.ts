import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COOLDOWN_MINUTES = 15;
const MAX_SWITCHES_PER_DAY = 3;

interface SwitchRoleRequest {
  newRole: 'locataire' | 'proprietaire' | 'agence' | 'admin_ansut';
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[switch-role-v2] Request received');

    // 1. Authentification
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('[switch-role-v2] Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[switch-role-v2] User: ${user.id}`);

    // 2. Parsing de la requête
    const { newRole }: SwitchRoleRequest = await req.json();

    if (!['locataire', 'proprietaire', 'agence', 'admin_ansut'].includes(newRole)) {
      return new Response(
        JSON.stringify({ error: 'Rôle invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Récupérer les rôles actuels
    const { data: userRoles, error: fetchError } = await supabaseClient
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError || !userRoles) {
      console.error('[switch-role-v2] Failed to fetch user roles:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Impossible de récupérer vos rôles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const oldRole = userRoles.active_role;

    // 4. Vérifier que l'utilisateur ne bascule pas vers son rôle actuel
    if (oldRole === newRole) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Ce rôle est déjà actif',
          newRole,
          remainingSwitchesToday: MAX_SWITCHES_PER_DAY - userRoles.switch_count_today
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Vérifier que le rôle est disponible
    const roles = userRoles.roles as Record<string, any>;
    
    if (!roles[newRole] || !roles[newRole].enabled) {
      console.warn(`[switch-role-v2] Role ${newRole} not available for user ${user.id}`);
      return new Response(
        JSON.stringify({ 
          error: 'Rôle non disponible',
          message: `Le rôle "${newRole}" n'est pas disponible pour votre compte.`,
          availableRoles: Object.keys(roles).filter(r => roles[r].enabled)
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Vérifier le cooldown (15 minutes)
    if (userRoles.last_switch_at) {
      const lastSwitchTime = new Date(userRoles.last_switch_at).getTime();
      const now = Date.now();
      const minutesSinceLastSwitch = (now - lastSwitchTime) / 1000 / 60;

      if (minutesSinceLastSwitch < COOLDOWN_MINUTES) {
        const remainingMinutes = Math.ceil(COOLDOWN_MINUTES - minutesSinceLastSwitch);
        console.warn(`[switch-role-v2] Cooldown active for user ${user.id}`);
        
        return new Response(
          JSON.stringify({ 
            error: 'Cooldown actif',
            message: `Veuillez attendre ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''} avant de changer à nouveau de rôle.`,
            remainingMinutes
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 7. Vérifier la limite quotidienne (3 changements/jour)
    const today = new Date().setHours(0, 0, 0, 0);
    const lastSwitchDay = userRoles.last_switch_at 
      ? new Date(userRoles.last_switch_at).setHours(0, 0, 0, 0)
      : 0;
    
    let countToday = userRoles.switch_count_today || 0;
    
    // Réinitialiser le compteur si on est un nouveau jour
    if (today > lastSwitchDay) {
      countToday = 0;
    }

    if (countToday >= MAX_SWITCHES_PER_DAY) {
      console.warn(`[switch-role-v2] Daily limit reached for user ${user.id}`);
      return new Response(
        JSON.stringify({ 
          error: 'Limite quotidienne atteinte',
          message: `Vous avez atteint la limite de ${MAX_SWITCHES_PER_DAY} changements par jour. Réessayez demain.`,
          nextResetAt: new Date(today + 24 * 60 * 60 * 1000).toISOString()
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 8. Validation spécifique pour le rôle "proprietaire"
    if (newRole === 'proprietaire') {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('oneci_verified, phone_verified, email_verified, profile_completion')
        .eq('id', user.id)
        .single();

      if (!profile) {
        return new Response(
          JSON.stringify({ error: 'Profil introuvable' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const missingRequirements = [];
      if (!profile.oneci_verified) missingRequirements.push('Vérification ONECI (CNI)');
      if (!profile.phone_verified) missingRequirements.push('Téléphone vérifié');
      if (!profile.email_verified) missingRequirements.push('Email vérifié');
      if ((profile.profile_completion || 0) < 80) missingRequirements.push('Profil complété (80%)');

      if (missingRequirements.length > 0) {
        console.warn(`[switch-role-v2] Requirements not met for proprietaire role: ${missingRequirements.join(', ')}`);
        return new Response(
          JSON.stringify({ 
            error: 'Prérequis non remplis',
            message: 'Pour devenir propriétaire, vous devez compléter les étapes suivantes :',
            missingRequirements
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 9. Mise à jour atomique du rôle
    const { error: updateError } = await supabaseClient
      .from('user_roles')
      .update({
        active_role: newRole,
        last_switch_at: new Date().toISOString(),
        switch_count_today: countToday + 1,
        switch_count_total: (userRoles.switch_count_total || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[switch-role-v2] Failed to update role:', updateError);
      throw new Error('Échec de la mise à jour du rôle');
    }

    console.log(`[switch-role-v2] ✅ Role updated: ${oldRole} → ${newRole}`);

    // 10. Synchroniser profiles.user_type (rétrocompatibilité)
    await supabaseClient
      .from('profiles')
      .update({ 
        user_type: newRole,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .then(({ error }) => {
        if (error) console.error('[switch-role-v2] Failed to sync profile.user_type:', error);
      });

    // 11. Envoyer notification asynchrone (ne pas attendre)
    supabaseClient.functions.invoke('send-role-change-notification', {
      body: { 
        userId: user.id, 
        oldRole, 
        newRole,
        switchCount: countToday + 1
      }
    }).catch(err => console.error('[switch-role-v2] Notification failed:', err));

    // 12. Réponse de succès
    const remainingSwitches = MAX_SWITCHES_PER_DAY - countToday - 1;
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Basculement vers le mode ${newRole} réussi`,
        oldRole,
        newRole,
        remainingSwitchesToday: remainingSwitches,
        cooldownMinutes: COOLDOWN_MINUTES
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('[switch-role-v2] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erreur interne',
        message: error.message || 'Une erreur inattendue s\'est produite'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

