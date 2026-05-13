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
 * Returns the base URL for the message API (POST)
 * L'URL complète est: baseUrl/gateway/api/message/send
 */
function getAzureMessageBaseUrl(): string {
  const baseUrl = Deno.env.get('AZURE_SMS_URL') || 'https://ansuthub.westeurope.cloudapp.azure.com/gateway/api';
  // S'assurer que l'URL ne se termine PAS par /
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  return cleanBaseUrl + '/message/send';
}

/**
 * Generates the HTML template for email OTP
 */
function generateEmailOtpHtml(email: string, otp: string, expiresIn: number = 10): string {
  const firstName = email.split('@')[0];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #ff6c2f, #ea580c); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
        .otp-code { background: #fff7ed; border: 3px dashed #ff6c2f; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ff6c2f; margin: 20px 0; border-radius: 10px; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Verification Email</h1>
        <p>MonToit - Plateforme Immobilier</p>
      </div>
      <div class="content">
        <h2>Hello ${firstName}!</h2>
        <p>Welcome to MonToit. To finalize your registration, please verify your email address using the code below:</p>
        <div class="otp-code">${otp}</div>
        <p style="text-align: center; color: #6b7280;">
          <strong>This code expires in ${expiresIn} minutes</strong>
        </p>
        <div class="warning">
          <p style="margin: 0;"><strong>Important:</strong></p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px;">
            <li>Never share this code with anyone</li>
            <li>MonToit will never ask for this code by phone</li>
            <li>This code is single use</li>
          </ul>
        </div>
        <p>If you did not create an account, simply ignore this email.</p>
      </div>
      <div class="footer">
        <p>2025 MonToit - All rights reserved</p>
        <p>This message was sent to ${email}</p>
      </div>
    </body>
    </html>
  `;
}

serve(async (req) => {
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

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const azureUsername = Deno.env.get('AZURE_SMS_USERNAME');
    const azurePassword = Deno.env.get('AZURE_SMS_PASSWORD');
    const azureFrom = Deno.env.get('AZURE_SMS_FROM') || 'MonToit';

    if (!azureUsername || !azurePassword) {
      console.error('[email-otp-send] Azure configuration missing');
      return new Response(
        JSON.stringify({
          error: 'Email service not configured',
          detail: 'AZURE_SMS_USERNAME and AZURE_SMS_PASSWORD environment variables are missing'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    console.log('\n========================================');
    console.log('OTP EMAIL VERIFICATION');
    console.log('========================================');
    console.log('Email:   ' + email);
    console.log('OTP:     ' + code);
    console.log('Purpose: Email verification');
    console.log('Expires: 10 minutes');
    console.log('========================================\n');

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

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
      console.error('OTP insert error:', insertError);
      return new Response(
        JSON.stringify({
          error: 'Error creating verification code',
          detail: insertError.message,
          code: insertError.code,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailHtml = generateEmailOtpHtml(email, code, 10);
    const subject = 'Verify your email address - MonToit';

    const emailPayload = {
      to: email,
      cc: null,
      bcc: null,
      subject: subject,
      content: emailHtml,
      ishtml: true,
      username: azureUsername,
      password: azurePassword,
      from: azureFrom,
      channel: 'Email'
    };

    const messageUrl = getAzureMessageBaseUrl();

    console.log('[email-otp-send] Sending email to ' + email + '...');
    console.log('[email-otp-send] URL: ' + messageUrl);

    const azureResponse = await fetch(messageUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload)
    });

    const responseText = await azureResponse.text();

    if (!azureResponse.ok) {
      console.error('[email-otp-send] Azure error:', {
        status: azureResponse.status,
        statusText: azureResponse.statusText,
        body: responseText,
      });

      let errorMessage = 'Error sending email';
      if (azureResponse.status === 401) {
        errorMessage = 'Invalid API credentials (Azure)';
      } else if (azureResponse.status === 403) {
        errorMessage = 'Access Forbidden - Verify Azure configuration';
      } else if (azureResponse.status === 400 || azureResponse.status === 422) {
        errorMessage = 'Invalid email parameters';
      } else if (azureResponse.status === 429) {
        errorMessage = 'Too many requests. Please try again later.';
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
          detail: responseText,
          status: azureResponse.status
        }),
        { status: azureResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[email-otp-send] OTP sent to ' + email + ', Azure status: ' + azureResponse.status);

    const responseData: { success: boolean; message: string; expiresIn: number; devOtp?: string } = {
      success: true,
      message: 'A verification code has been sent to your email address',
      expiresIn: 600
    };

    const isDev = Deno.env.get('ENVIRONMENT') !== 'production';
    if (isDev) {
      responseData.devOtp = code;
      console.log('[DEV MODE] OTP for tests: ' + code);
    }

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[email-otp-send] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'An unexpected error occurred',
        detail: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
