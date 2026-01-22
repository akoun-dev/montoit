/**
 * Edge Function: cryptoneo-send-otp
 *
 * Envoi de code OTP pour signature électronique
 * - Génère l'OTP localement
 * - Envoie via Azure SMS ou Brevo Email
 * - Stocke dans la table otp_codes pour validation ultérieure
 *
 * Configuration requise dans Supabase Secrets:
 * - AZURE_SMS_URL, AZURE_SMS_USERNAME, AZURE_SMS_PASSWORD, AZURE_SMS_FROM
 * - BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

interface OtpRequest {
  phone?: string;   // Format E.164: +2250700000000 (pour SMS)
  email?: string;   // Adresse email (pour email)
  canal?: 'SMS' | 'MAIL';  // Forcer le canal
}

interface OtpResponse {
  statusCode: number;
  statusMessage: string;
  data?: {
    expiresIn: number;
    canal: string;
    otp?: string;  // Pour développement uniquement
  };
}

/**
 * Valide le format E.164 du numéro de téléphone
 */
function validatePhone(phone: string): boolean {
  const e164Regex = /^\+[1-9]\d{7,14}$/;
  return e164Regex.test(phone);
}

/**
 * Construit l'URL pour l'API Azure MTN
 */
function buildAzureUrl(phone: string, message: string): string {
  const baseUrl = Deno.env.get('AZURE_SMS_URL') || 'https://ansuthub.westeurope.cloudapp.azure.com/gateway/api';
  const username = Deno.env.get('AZURE_SMS_USERNAME') || '';
  const password = Deno.env.get('AZURE_SMS_PASSWORD') || '';
  const from = Deno.env.get('AZURE_SMS_FROM') || 'ANSUT';

  const encodedUsername = encodeURIComponent(username);
  const encodedPassword = encodeURIComponent(password);
  const encodedFrom = encodeURIComponent(from);
  const encodedText = encodeURIComponent(message);

  return `${baseUrl}/SendSMS?Username=${encodedUsername}&Password=${encodedPassword}&From=${encodedFrom}&To=${phone};&Text=${encodedText}&dlrUrl=`;
}

/**
 * Génère un code OTP à 6 chiffres
 */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Envoie un SMS via Azure MTN
 */
async function sendSmsViaAzure(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  const azureUrl = Deno.env.get('AZURE_SMS_URL');
  const azureUsername = Deno.env.get('AZURE_SMS_USERNAME');
  const azurePassword = Deno.env.get('AZURE_SMS_PASSWORD');
  const azureFrom = Deno.env.get('AZURE_SMS_FROM');

  if (!azureUrl || !azureUsername || !azurePassword || !azureFrom) {
    console.error('[cryptoneo-send-otp] Azure SMS configuration missing');
    return { success: false, error: 'Service SMS non configuré' };
  }

  const smsUrl = buildAzureUrl(phone, message);
  console.log('[cryptoneo-send-otp] Sending SMS to:', phone.substring(0, 6) + '****');

  const azureResponse = await fetch(smsUrl, {
    method: 'GET',
    headers: { 'Accept': 'text/plain' },
  });

  const responseText = await azureResponse.text();
  console.log('[cryptoneo-send-otp] Azure response status:', azureResponse.status);

  if (!azureResponse.ok) {
    console.error('[cryptoneo-send-otp] Azure error:', responseText);
    return { success: false, error: `Erreur Azure SMS` };
  }

  console.log('[cryptoneo-send-otp] SMS sent successfully');
  return { success: true };
}

/**
 * Envoie un email via Brevo
 */
async function sendEmailViaBrevo(email: string, subject: string, htmlContent: string): Promise<{ success: boolean; error?: string }> {
  const brevoApiKey = Deno.env.get('BREVO_API_KEY');

  if (!brevoApiKey) {
    console.error('[cryptoneo-send-otp] Brevo API key missing');
    return { success: false, error: 'Service email non configuré' };
  }

  const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') || 'no-reply@ansut.ci';
  const senderName = Deno.env.get('BREVO_SENDER_NAME') || 'MonToit';

  console.log('[cryptoneo-send-otp] Sending email to:', email);

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': brevoApiKey,
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email }],
      subject,
      htmlContent,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[cryptoneo-send-otp] Brevo error:', response.status, errorText);

    let errorDetail = errorText.substring(0, 200);
    try {
      const errorJson = JSON.parse(errorText);
      errorDetail = errorJson.message || errorJson.code || errorText;
    } catch {}

    return { success: false, error: `Erreur Brevo (${response.status}): ${errorDetail}` };
  }

  console.log('[cryptoneo-send-otp] Email sent successfully');
  return { success: true };
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Méthode non autorisée' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('=== cryptoneo-send-otp called ===');

    const body = await req.json() as OtpRequest;

    // Authentifier l'utilisateur
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

    console.log('[cryptoneo-send-otp] User authenticated:', user.id);

    // Récupérer le profil utilisateur
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('phone, email')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Profil non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Déterminer le canal et la destination
    const canal = body.canal || 'SMS';  // SMS par défaut
    const phone = body.phone || profile.phone;
    const email = body.email || profile.email || user.email;

    console.log('[cryptoneo-send-otp] Canal:', canal);
    console.log('[cryptoneo-send-otp] Phone:', phone ? phone.substring(0, 6) + '****' : 'N/A');
    console.log('[cryptoneo-send-otp] Email:', email ? email.substring(0, 3) + '***@***' : 'N/A');

    // Validation
    if (canal === 'SMS') {
      if (!phone) {
        console.error('[cryptoneo-send-otp] No phone number for SMS');
        return new Response(
          JSON.stringify({ error: 'Numéro de téléphone requis pour SMS' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!validatePhone(phone)) {
        console.error('[cryptoneo-send-otp] Invalid phone format:', phone);
        return new Response(
          JSON.stringify({ error: 'Numéro de téléphone invalide (format E.164 requis: +2250700000000)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (canal === 'MAIL') {
      if (!email || !email.includes('@')) {
        console.error('[cryptoneo-send-otp] Invalid email:', email);
        return new Response(
          JSON.stringify({ error: 'Adresse email invalide' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 1. Générer l'OTP
    const otp = generateOTP();
    console.log('[cryptoneo-send-otp] Generated OTP for user:', user.id);

    // 2. Stocker l'OTP dans la table otp_codes
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Supprimer les anciens OTP pour ce user/purpose
    await supabaseAdmin
      .from('otp_codes')
      .delete()
      .eq('recipient', user.id)
      .eq('purpose', 'verification');

    // Insérer le nouvel OTP
    const { error: insertError } = await supabaseAdmin
      .from('otp_codes')
      .insert({
        recipient: user.id,  // On utilise user.id comme recipient pour notre cas
        code: otp,
        method: canal === 'SMS' ? 'sms' : 'email',
        purpose: 'verification',  // Utilise 'verification' au lieu de 'electronic_signature'
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('[cryptoneo-send-otp] Error storing OTP:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors du stockage du code OTP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Envoyer l'OTP via notre système
    let result;
    if (canal === 'SMS') {
      const message = `Votre code de signature MonToit est: ${otp}. Valide 5 minutes.`;
      result = await sendSmsViaAzure(phone!, message);
    } else {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .code { font-size: 32px; font-weight: bold; letter-spacing: 5px; text-align: center; padding: 20px; background: #f5f5f5; border-radius: 8px; }
            .footer { font-size: 12px; color: #666; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Code de signature électronique</h2>
            <p>Bonjour,</p>
            <p>Voici votre code de vérification pour la signature de vos documents :</p>
            <div class="code">${otp}</div>
            <p>Ce code est valide pendant 5 minutes.</p>
            <p>Si vous n'avez pas demandé ce code, ignorez cet email.</p>
            <div class="footer">
              <p>Cet email a été envoyé automatiquement par MonToit.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      result = await sendEmailViaBrevo(email!, 'Votre code de signature MonToit', htmlContent);
    }

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log in admin audit logs
    await supabaseAdmin.from('admin_audit_logs').insert({
      admin_id: user.id,
      action_type: 'otp_sent',
      target_type: 'electronic_signature',
      target_id: user.id,
      notes: `OTP envoyé par ${canal} pour signature électronique`
    });

    console.log('[cryptoneo-send-otp] OTP sent successfully via', canal);

    return new Response(
      JSON.stringify({
        statusCode: 7002,
        statusMessage: 'OTP envoyé avec succès',
        data: {
          expiresIn: 300,
          canal: canal,
          otp: otp,  // Pour développement uniquement
        }
      } as OtpResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[cryptoneo-send-otp] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
