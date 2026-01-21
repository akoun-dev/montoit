import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Non authentifié');
    }

    const {
      passportNumber,
      nationality,
      firstName,
      lastName,
      birthDate,
      issueDate,
      expiryDate,
    } = await req.json();

    console.log('Processing passport verification for user:', user.id);

    // Validate required fields
    if (!passportNumber || !nationality || !firstName || !lastName || !birthDate || !issueDate || !expiryDate) {
      throw new Error('Tous les champs sont requis');
    }

    // Check if passport is expired
    const expiryDateTime = new Date(expiryDate);
    if (expiryDateTime < new Date()) {
      throw new Error('Le passeport est expiré');
    }

    // Store passport data
    const passportData = {
      firstName,
      lastName,
      birthDate,
      issueDate,
      expiryDate,
    };

    // Update user_verifications table
    const { error: verificationError } = await supabaseClient
      .from('user_verifications')
      .upsert({
        user_id: user.id,
        passport_number: passportNumber,
        passport_nationality: nationality,
        passport_data: passportData,
        passport_status: 'pending_review',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (verificationError) throw verificationError;

    // Update profile nationality
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({
        nationality,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (profileError) throw profileError;

    console.log('Passport verification submitted successfully for user:', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Vérification passeport soumise avec succès',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in passport-verification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
