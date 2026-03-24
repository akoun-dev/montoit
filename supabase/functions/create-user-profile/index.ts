/**
 * Edge Function: create-user-profile
 *
 * Crée automatiquement un profil utilisateur lors de l'inscription
 * Utilise le service role key pour contourner les limitations RLS
 *
 * Usage: appelé par le frontend après signup réussi
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

interface CreateProfileRequest {
  userId: string;
  email: string;
  full_name: string;
  user_type?: string;
  phone?: string;
}

interface CreateProfileResponse {
  success: boolean;
  error?: string;
  profile?: {
    id: string;
    email: string;
    full_name: string;
    user_type: string;
  };
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { userId, email, full_name, user_type = 'tenant', phone }: CreateProfileRequest = await req.json();

    if (!userId || !email) {
      return new Response(
        JSON.stringify({ error: 'userId et email sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-user-profile] Creating profile for user:', { userId, email, full_name, user_type, phone });

    // Utiliser le service role key pour contourner RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier si le profil existe déjà
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (existingProfile) {
      console.log('[create-user-profile] Profile already exists:', existingProfile);
      return new Response(
        JSON.stringify({
          success: true,
          profile: existingProfile,
        } as CreateProfileResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Créer le profil
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email,
        full_name: full_name,
        user_type,
        phone: phone || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[create-user-profile] Error inserting profile:', insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: insertError.message,
        } as CreateProfileResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-user-profile] Profile created successfully:', newProfile);

    return new Response(
      JSON.stringify({
        success: true,
        profile: newProfile,
      } as CreateProfileResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[create-user-profile] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      } as CreateProfileResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
