import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CRYPTONEO_BASE_URL = Deno.env.get('CRYPTONEO_BASE_URL');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, email } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validation des paramètres
    if (!phone && !email) {
      return new Response(
        JSON.stringify({ error: 'Au moins un numéro de téléphone ou un email est requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📱 Envoi OTP CryptoNeo pour user:', user.id);

    // 1. Get JWT token from auth function
    const authResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/cryptoneo-auth`, {
      headers: { Authorization: req.headers.get('Authorization')! }
    });
    
    if (!authResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Échec authentification CryptoNeo' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { token: jwt } = await authResponse.json();

    // 2. Call CryptoNeo OTP API
    const otpPayload: any = {};
    if (phone) otpPayload.phone = phone;
    if (email) otpPayload.email = email;

    const cryptoneoResponse = await fetch(`${CRYPTONEO_BASE_URL}/otp/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(otpPayload)
    });

    if (!cryptoneoResponse.ok) {
      const error = await cryptoneoResponse.text();
      console.error('CryptoNeo OTP send failed:', error);
      return new Response(
        JSON.stringify({ error: 'Échec envoi OTP CryptoNeo' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const otpData = await cryptoneoResponse.json();
    console.log('✅ OTP envoyé avec succès:', otpData);

    // 3. Log in admin audit logs
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabaseAdmin.from('admin_audit_logs').insert({
      admin_id: user.id,
      action_type: 'otp_sent',
      target_type: 'cryptoneo_signature',
      target_id: user.id,
      notes: `OTP envoyé à ${phone || email}`
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'OTP envoyé avec succès',
        expiresIn: 300 // 5 minutes
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in cryptoneo-send-otp:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

