import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface SendOtpRequest {
  email: string;
  purpose?: 'email_verification' | 'password_reset' | 'phone_verification';
}

/**
 * Edge Function: Envoyer un OTP de vérification par email via Resend
 *
 * POST /functions/v1/send-verification-otp
 * Body: { email: string, purpose?: string }
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
    const { email, purpose = 'email_verification' }: SendOtpRequest = await req.json();

    // Validation
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Format d\'email invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Configuration Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'no-reply@notifications.ansut.ci';
    const RESEND_API_URL = 'https://api.resend.com/emails';

    if (!RESEND_API_KEY) {
      console.error('[send-verification-otp] RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({
          error: 'Service email non configuré',
          detail: 'RESEND_API_KEY environment variable is missing'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier le rate limiting (max 3 OTPs par heure par email)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentOtps, error: countError } = await supabase
      .from('otp_codes')
      .select('id')
      .eq('recipient', email)
      .eq('purpose', purpose)
      .gte('created_at', oneHourAgo);

    if (countError) {
      console.error('Erreur lors de la vérification rate limit:', countError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la vérification' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (recentOtps && recentOtps.length >= 3) {
      return new Response(
        JSON.stringify({
          error: 'Trop de tentatives. Veuillez réessayer dans 1 heure.',
          code: 'RATE_LIMIT_EXCEEDED'
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Générer un OTP de 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // LOG POUR LE DÉVELOPPEMENT - Afficher l'OTP dans la console Supabase
    console.log('\n========================================');
    console.log('📧 OTP DE VÉRIFICATION EMAIL');
    console.log('========================================');
    console.log(`Email:    ${email}`);
    console.log(`OTP:     ${code}`);
    console.log(`But:      Vérification email`);
    console.log(`Expire:   10 minutes`);
    console.log('========================================\n');

    // Expiration: 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Stocker l'OTP dans la base
    const { error: insertError } = await supabase
      .from('otp_codes')
      .insert({
        recipient: email,
        code,
        purpose,
        method: 'email',
        expires_at: expiresAt,
        used: false,
        attempts: 0,
        max_attempts: 3,
      });

    if (insertError) {
      console.error('Erreur lors de l\'insertion OTP:', insertError);
      return new Response(
        JSON.stringify({
          error: 'Erreur lors de la création du code de vérification',
          detail: insertError.message,
          code: insertError.code,
          hint: insertError.hint,
          details: insertError.details
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Préparer l'email HTML pour OTP
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
          .otp-code { background: #fff7ed; border: 3px dashed #f97316; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #f97316; margin: 20px 0; border-radius: 10px; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔐 Vérification Email</h1>
          <p>Mon Toit - Plateforme Immobilière</p>
        </div>
        <div class="content">
          <h2>Bonjour ${email.split('@')[0]} !</h2>
          <p>Merci de vous être inscrit sur Mon Toit. Pour finaliser votre inscription, veuillez vérifier votre adresse email en utilisant le code ci-dessous :</p>
          <div class="otp-code">${code}</div>
          <p style="text-align: center; color: #6b7280;">
            <strong>Ce code expire dans 10 minutes</strong>
          </p>
          <div class="warning">
            <p style="margin: 0;"><strong>⚠️ Important :</strong></p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px;">
              <li>Ne partagez jamais ce code avec qui que ce soit</li>
              <li>Mon Toit ne vous demandera jamais ce code par téléphone</li>
              <li>Ce code est à usage unique</li>
            </ul>
          </div>
          <p>Si vous n'avez pas créé de compte, ignorez simplement cet email.</p>
        </div>
        <div class="footer">
          <p>© 2025 Mon Toit - Tous droits réservés</p>
          <p>Ce message a été envoyé à ${email}</p>
        </div>
      </body>
      </html>
    `;

    // Préparer le payload pour Resend
    const payload = {
      from: RESEND_FROM_EMAIL,
      to: [email],
      subject: 'Vérifiez votre adresse email - Mon Toit',
      html: emailHtml,
      tags: [
        { name: 'category', value: 'mon-toit' },
        { name: 'template', value: 'email-verification' },
        { name: 'purpose', value: purpose }
      ]
    };

    // Envoyer l'email via Resend API
    const resendResponse = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('[send-verification-otp] Resend error:', {
        status: resendResponse.status,
        statusText: resendResponse.statusText,
        body: resendResult,
      });

      // Analyser l'erreur pour un message plus clair
      let errorMessage = 'Erreur lors de l\'envoi de l\'email';
      if (resendResponse.status === 401) {
        errorMessage = 'Clé API Resend invalide';
      } else if (resendResponse.status === 403) {
        errorMessage = 'Accès Refusé - Vérifiez la configuration du domaine Resend';
      } else if (resendResponse.status === 400 || resendResponse.status === 422) {
        errorMessage = 'Paramètres d\'email invalides';
      } else if (resendResponse.status === 429) {
        errorMessage = 'Trop de demandes. Veuillez réessayer plus tard.';
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
          detail: resendResult,
          status: resendResponse.status
        }),
        { status: resendResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-verification-otp] OTP envoyé à ${email}, ID: ${resendResult.id}`);

    // En développement, inclure l'OTP dans la réponse pour faciliter les tests
    const responseData: any = {
      success: true,
      message: 'Un code de vérification a été envoyé à votre adresse email',
      emailId: resendResult.id,
      expiresIn: 600 // 10 minutes en secondes
    };

    // En développement uniquement, inclure l'OTP pour faciliter le débogage
    const isDev = Deno.env.get('ENVIRONMENT') !== 'production';
    if (isDev) {
      responseData.devOtp = code;
      console.log(`[DEV MODE] OTP pour tests: ${code}`);
    }

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[send-verification-otp] Erreur inattendue:', error);
    return new Response(
      JSON.stringify({
        error: 'Une erreur inattendue s\'est produite',
        detail: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
