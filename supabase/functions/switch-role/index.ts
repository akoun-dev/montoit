import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SwitchRoleRequest {
  newRole: 'locataire' | 'proprietaire' | 'agence';
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      console.error('[switch-role] Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[switch-role] Request from user: ${user.id}`);

    // 2. Parsing de la requête
    const { newRole }: SwitchRoleRequest = await req.json();

    if (!['locataire', 'proprietaire', 'agence'].includes(newRole)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be: locataire, proprietaire, or agence' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Rate Limiting (max 5 changements/heure)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentChanges, error: countError } = await supabaseClient
      .from('admin_audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('admin_id', user.id)
      .eq('action_type', 'role_switch')
      .gte('created_at', oneHourAgo);

    if (countError) {
      console.error('[switch-role] Rate limit check failed:', countError);
    } else if (recentChanges && recentChanges >= 5) {
      console.warn(`[switch-role] Rate limit exceeded for user ${user.id}`);
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          message: 'Vous avez atteint la limite de 5 changements de rôle par heure. Veuillez réessayer plus tard.',
          retryAfter: '1 hour'
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Vérifier que le rôle est disponible
    const { data: activeRoles, error: fetchError } = await supabaseClient
      .from('user_active_roles')
      .select('current_role, available_roles')
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error('[switch-role] Failed to fetch user roles:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user roles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier si l'utilisateur essaie de basculer vers son rôle actuel
    if (activeRoles.current_role === newRole) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Ce rôle est déjà actif',
          currentRole: newRole 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!activeRoles.available_roles.includes(newRole)) {
      console.warn(`[switch-role] Role ${newRole} not available for user ${user.id}`);
      return new Response(
        JSON.stringify({ 
          error: 'Role not available',
          message: `Le rôle "${newRole}" n'est pas disponible pour votre compte. Rôles disponibles: ${activeRoles.available_roles.join(', ')}`,
          availableRoles: activeRoles.available_roles
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const oldRole = activeRoles.current_role;

    // 5. Mettre à jour le rôle actif
    const { error: updateRoleError } = await supabaseClient
      .from('user_active_roles')
      .update({ 
        current_role: newRole, 
        updated_at: new Date().toISOString() 
      })
      .eq('user_id', user.id);

    if (updateRoleError) {
      console.error('[switch-role] Failed to update role:', updateRoleError);
      throw new Error('Failed to update role');
    }

    console.log(`[switch-role] Role updated: ${oldRole} → ${newRole}`);

    // 6. Synchroniser profiles.user_type (pour rétrocompatibilité)
    const { error: updateProfileError } = await supabaseClient
      .from('profiles')
      .update({ 
        user_type: newRole,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateProfileError) {
      console.error('[switch-role] Failed to sync profile.user_type:', updateProfileError);
    }

    // 7. Logger l'action dans admin_audit_logs
    const { error: logError } = await supabaseClient
      .from('admin_audit_logs')
      .insert({
        admin_id: user.id,
        action_type: 'role_switch',
        target_type: 'user',
        target_id: user.id,
        old_values: { role: oldRole },
        new_values: { role: newRole },
        notes: `Utilisateur a basculé de ${oldRole} vers ${newRole}`,
        action_metadata: {
          timestamp: new Date().toISOString(),
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
          user_agent: req.headers.get('user-agent'),
        }
      });

    if (logError) {
      console.error('[switch-role] Failed to log action:', logError);
    }

    // 8. Créer une notification
    const roleLabels = {
      locataire: '🏠 Locataire',
      proprietaire: '🔑 Propriétaire',
      agence: '🏢 Agence'
    };

    const { error: notifError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'role_changed',
        category: 'account',
        title: 'Changement de rôle effectué',
        message: `Vous êtes maintenant en mode ${roleLabels[newRole]}. Votre interface a été mise à jour.`,
        link: newRole === 'locataire' ? '/dashboard' : '/mes-biens',
        metadata: {
          old_role: oldRole,
          new_role: newRole,
          timestamp: new Date().toISOString()
        }
      });

    if (notifError) {
      console.error('[switch-role] Failed to create notification:', notifError);
    }

    // 9. Envoyer un email de confirmation
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const siteUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '') || 'https://montoit.ci';
    const dashboardUrl = `${siteUrl}${newRole === 'locataire' ? '/dashboard' : '/mes-biens'}`;

    const { error: emailError } = await supabaseClient.functions.invoke('send-email', {
      body: {
        to: user.email,
        subject: '🔄 Confirmation de changement de rôle - Mon Toit',
        template: 'role-change-confirmation',
        data: {
          userName: profile?.full_name || 'Utilisateur',
          oldRole: roleLabels[oldRole as keyof typeof roleLabels],
          newRole: roleLabels[newRole],
          timestamp: new Date().toLocaleString('fr-FR', { 
            dateStyle: 'long', 
            timeStyle: 'short',
            timeZone: 'Africa/Abidjan'
          }),
          dashboardUrl
        }
      }
    });

    if (emailError) {
      console.error('[switch-role] Failed to send confirmation email:', emailError);
      // Ne pas bloquer la réponse si l'email échoue
    }

    console.log(`[switch-role] ✅ Role switch successful for user ${user.id}`);

    // 10. Réponse de succès
    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Basculement vers le mode ${roleLabels[newRole]} réussi`,
        data: {
          oldRole,
          newRole,
          redirectTo: newRole === 'locataire' ? '/dashboard' : '/mes-biens',
          notificationSent: !notifError,
          emailSent: !emailError
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('[switch-role] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message || 'Une erreur inattendue s\'est produite'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
