import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AddRoleRequest {
  roleToAdd: 'locataire' | 'proprietaire' | 'agence';
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
      console.error('[add-role] Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[add-role] Request from user: ${user.id}`);

    // 2. Parsing de la requête
    const { roleToAdd }: AddRoleRequest = await req.json();

    if (!['locataire', 'proprietaire', 'agence'].includes(roleToAdd)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid role',
          message: 'Le rôle doit être: locataire, proprietaire, ou agence'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Vérifier les rôles actuels de l'utilisateur
    const { data: activeRoles, error: fetchError } = await supabaseClient
      .from('user_active_roles')
      .select('available_roles, current_role')
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error('[add-role] Failed to fetch user roles:', fetchError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch user roles',
          message: 'Impossible de récupérer vos rôles actuels'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Vérifier si le rôle existe déjà
    if (activeRoles.available_roles.includes(roleToAdd)) {
      console.warn(`[add-role] Role ${roleToAdd} already exists for user ${user.id}`);
      return new Response(
        JSON.stringify({ 
          error: 'Role already exists',
          message: `Le rôle "${roleToAdd}" est déjà activé pour votre compte`,
          availableRoles: activeRoles.available_roles
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Restriction pour le rôle agence (nécessite validation manuelle)
    if (roleToAdd === 'agence') {
      console.warn(`[add-role] Agence role requires manual validation for user ${user.id}`);
      return new Response(
        JSON.stringify({ 
          error: 'Manual validation required',
          message: 'L\'ajout du rôle Agence nécessite une validation manuelle. Veuillez contacter le support à support@montoit.ci',
          supportEmail: 'support@montoit.ci'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Utiliser la fonction RPC pour ajouter le rôle
    const { error: addRoleError } = await supabaseClient.rpc('add_available_role', {
      p_user_id: user.id,
      p_new_role: roleToAdd
    });

    if (addRoleError) {
      console.error('[add-role] Failed to add role:', addRoleError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to add role',
          message: 'Impossible d\'ajouter le rôle. Veuillez réessayer.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[add-role] Role added successfully: ${roleToAdd}`);

    // 7. Récupérer les rôles mis à jour
    const { data: updatedRoles } = await supabaseClient
      .from('user_active_roles')
      .select('available_roles, current_role')
      .eq('user_id', user.id)
      .single();

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
        type: 'role_added',
        category: 'account',
        title: 'Nouveau rôle ajouté',
        message: `Le rôle ${roleLabels[roleToAdd]} a été ajouté à votre compte. Vous pouvez maintenant basculer entre vos différents rôles.`,
        link: '/profile',
        metadata: {
          added_role: roleToAdd,
          available_roles: updatedRoles?.available_roles || [],
          timestamp: new Date().toISOString()
        }
      });

    if (notifError) {
      console.error('[add-role] Failed to create notification:', notifError);
    }

    // 9. Envoyer un email de confirmation
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const { error: emailError } = await supabaseClient.functions.invoke('send-email', {
      body: {
        to: user.email,
        subject: '✨ Nouveau rôle ajouté - Mon Toit',
        template: 'role-added',
        data: {
          userName: profile?.full_name || 'Utilisateur',
          addedRole: roleLabels[roleToAdd],
          availableRoles: (updatedRoles?.available_roles || [])
            .map((r: string) => roleLabels[r as keyof typeof roleLabels])
            .join(', '),
          timestamp: new Date().toLocaleString('fr-FR', {
            dateStyle: 'long', 
            timeStyle: 'short',
            timeZone: 'Africa/Abidjan'
          }),
          profileUrl: `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '') || 'https://montoit.ci'}/profile`
        }
      }
    });

    if (emailError) {
      console.error('[add-role] Failed to send confirmation email:', emailError);
      // Ne pas bloquer la réponse si l'email échoue
    }

    console.log(`[add-role] ✅ Role addition successful for user ${user.id}`);

    // 10. Réponse de succès
    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Le rôle ${roleLabels[roleToAdd]} a été ajouté avec succès`,
        data: {
          addedRole: roleToAdd,
          currentRole: updatedRoles?.current_role,
          availableRoles: updatedRoles?.available_roles || [],
          hasMultipleRoles: (updatedRoles?.available_roles?.length || 0) > 1,
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
    console.error('[add-role] Unexpected error:', error);
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
