import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyOtpRequest {
  email: string;
  code: string;
  purpose?: 'email_verification' | 'password_reset' | 'phone_verification';
}

/**
 * Edge Function: Vérifier un OTP de vérification par email
 *
 * POST /functions/v1/verify-email-otp
 * Body: { email: string, code: string, purpose?: string }
 *
 * Retourne: { success: boolean, message: string }
 */
serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { email, code, purpose = 'email_verification' }: VerifyOtpRequest = await req.json();

    // Validation
    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: 'Email et code requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      return new Response(
        JSON.stringify({ error: 'Code invalide. Le code doit contenir 6 chiffres.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rechercher l'OTP non utilisé et non expiré
    const now = new Date().toISOString();
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('recipient', email)
      .eq('code', code)
      .eq('purpose', purpose)
      .eq('used', false)
      .gte('expires_at', now)
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (otpError) {
      console.error('Erreur lors de la recherche OTP:', otpError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la vérification' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!otpRecord) {
      // Vérifier si c'est un code expiré pour donner un message spécifique
      const { data: expiredOtp } = await supabase
        .from('otp_codes')
        .select('id')
        .eq('recipient', email)
        .eq('code', code)
        .eq('purpose', purpose)
        .lt('expires_at', now)
        .maybeSingle();

      if (expiredOtp) {
        return new Response(
          JSON.stringify({
            error: 'Code expiré. Veuillez demander un nouveau code.',
            code: 'OTP_EXPIRED'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          error: 'Code invalide. Veuillez vérifier et réessayer.',
          code: 'OTP_INVALID'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier le nombre de tentatives
    const attempts = (otpRecord.attempts || 0) + 1;
    const maxAttempts = otpRecord.max_attempts || 3;

    if (attempts > maxAttempts) {
      // Marquer l'OTP comme utilisé pour empêcher d'autres tentatives
      await supabase
        .from('otp_codes')
        .update({ used: true, used_at: now, attempts })
        .eq('id', otpRecord.id);

      return new Response(
        JSON.stringify({
          error: 'Trop de tentatives. Veuillez demander un nouveau code.',
          code: 'TOO_MANY_ATTEMPTS'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Incrémenter le compteur de tentatives
    await supabase
      .from('otp_codes')
      .update({ attempts })
      .eq('id', otpRecord.id);

    // Marquer l'OTP comme utilisé
    const { error: updateError } = await supabase
      .from('otp_codes')
      .update({
        used: true,
        used_at: now,
        attempts
      })
      .eq('id', otpRecord.id);

    if (updateError) {
      console.error('Erreur lors du marquage OTP comme utilisé:', updateError);
    }

    console.log(`OTP vérifié avec succès pour ${email} (${purpose})`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email vérifié avec succès',
        verifiedAt: now
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erreur inattendue:', error);
    return new Response(
      JSON.stringify({
        error: 'Une erreur inattendue s\'est produite',
        detail: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
