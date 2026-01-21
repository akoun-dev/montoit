/**
 * Edge function pour vérifier le token de réinitialisation et mettre à jour le mot de passe
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResetRequest {
  token: string;
  newPassword: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, newPassword }: ResetRequest = await req.json();

    // Validation des entrées
    if (!token || !newPassword) {
      console.log('[verify-reset-token] Missing token or password');
      return new Response(
        JSON.stringify({ error: 'Token et nouveau mot de passe requis', tokenInvalid: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validation du mot de passe
    if (newPassword.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Le mot de passe doit contenir au moins 8 caractères' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!/[A-Z]/.test(newPassword)) {
      return new Response(
        JSON.stringify({ error: 'Le mot de passe doit contenir au moins une majuscule' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!/[a-z]/.test(newPassword)) {
      return new Response(
        JSON.stringify({ error: 'Le mot de passe doit contenir au moins une minuscule' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!/[0-9]/.test(newPassword)) {
      return new Response(
        JSON.stringify({ error: 'Le mot de passe doit contenir au moins un chiffre' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Créer client Supabase avec service role pour bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    console.log('[verify-reset-token] Looking up token...');

    // Rechercher le token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      console.log('[verify-reset-token] Token not found:', tokenError?.message);
      return new Response(
        JSON.stringify({ error: 'Lien de réinitialisation invalide', tokenInvalid: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier si le token a déjà été utilisé
    if (tokenData.used_at) {
      console.log('[verify-reset-token] Token already used');
      return new Response(
        JSON.stringify({ error: 'Ce lien a déjà été utilisé', tokenUsed: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier l'expiration
    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt < new Date()) {
      console.log('[verify-reset-token] Token expired');
      return new Response(
        JSON.stringify({ error: 'Ce lien a expiré', tokenExpired: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[verify-reset-token] Token valid, updating password for user:', tokenData.user_id);

    // Mettre à jour le mot de passe via l'API Admin
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      tokenData.user_id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('[verify-reset-token] Error updating password:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la mise à jour du mot de passe' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Marquer le token comme utilisé
    const { error: markUsedError } = await supabaseAdmin
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenData.id);

    if (markUsedError) {
      console.warn('[verify-reset-token] Failed to mark token as used:', markUsedError);
      // Ne pas échouer pour autant, le mot de passe a été mis à jour
    }

    console.log('[verify-reset-token] Password updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Mot de passe mis à jour avec succès' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[verify-reset-token] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Une erreur inattendue est survenue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
