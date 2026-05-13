import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface WelcomeMessageRequest {
  user_id: string;
  email?: string;
  phone?: string;
  first_name?: string;
  registration_method: 'sms' | 'email';
}

interface WelcomeMessageResponse {
  status: 'ok' | 'error';
  channel_used?: 'sms' | 'email';
  message_id?: string;
  reason?: string;
}

/**
 * Returns the base URL for the message API (POST)
 */
function getAzureMessageBaseUrl(): string {
  const baseUrl = Deno.env.get('AZURE_SMS_URL') || 'https://ansuthub.westeurope.cloudapp.azure.com/gateway/api';
  const cleanBaseUrl = baseUrl.replace(/\/gateway\/api\/?$/, '');
  return cleanBaseUrl + '/api/message/send';
}

/**
 * Generates the HTML template for welcome email
 */
function generateWelcomeEmailHtml(firstName: string | undefined): string {
  const displayName = firstName || 'there';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #ff6c2f, #ea580c); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #ff6c2f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .features { margin: 20px 0; }
        .feature-item { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Welcome to MonToit!</h1>
        <p>Your Real Estate Journey Starts Here</p>
      </div>
      <div class="content">
        <h2>Hello ${displayName}!</h2>
        <p>Thank you for joining MonToit, your trusted platform for real estate in France.</p>

        <div class="features">
          <h3>What you can do:</h3>
          <div class="feature-item">🏠 <strong>Find properties</strong> - Search and discover available rentals</div>
          <div class="feature-item">📝 <strong>Apply online</strong> - Submit applications directly from the platform</div>
          <div class="feature-item">📱 <strong>Track progress</strong> - Stay updated on your applications</div>
          <div class="feature-item">🔒 <strong>Secure</strong> - Your data is protected with bank-level security</div>
        </div>

        <div style="text-align: center;">
          <a href="https://mon-toit.ansut.ci/dashboard" class="button">Get Started</a>
        </div>

        <p>If you have any questions, our support team is here to help. Contact us at support@mon-toit.ansut.ci</p>
      </div>
      <div class="footer">
        <p>2025 MonToit - All rights reserved</p>
        <p>Platform: https://mon-toit.ansut.ci</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generates the SMS message for welcome
 */
function generateWelcomeSms(firstName: string | undefined): string {
  const displayName = firstName || 'there';
  return `Bienvenue ${displayName} sur MonToit! 🏠 Votre parcours immobilier commence maintenant. Connectez-vous: https://mon-toit.ansut.ci/dashboard`;
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
    const body: WelcomeMessageRequest = await req.json();
    const { user_id, email, phone, first_name, registration_method } = body;

    console.log('[welcome-message] Processing request:', { user_id, registration_method });

    // Validation
    if (!user_id || !registration_method) {
      console.error('[welcome-message] Missing required fields');
      return new Response(
        JSON.stringify({ status: 'error', reason: 'user_id and registration_method are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (registration_method === 'email' && !email) {
      return new Response(
        JSON.stringify({ status: 'error', reason: 'Email is required for email method' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (registration_method === 'sms' && !phone) {
      return new Response(
        JSON.stringify({ status: 'error', reason: 'Phone is required for SMS method' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const azureUsername = Deno.env.get('AZURE_SMS_USERNAME');
    const azurePassword = Deno.env.get('AZURE_SMS_PASSWORD');
    const azureFrom = Deno.env.get('AZURE_SMS_FROM') || 'MonToit';

    if (!azureUsername || !azurePassword) {
      console.error('[welcome-message] Azure configuration missing');
      return new Response(
        JSON.stringify({
          status: 'error',
          reason: 'Message service not configured'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const messageUrl = getAzureMessageBaseUrl();
    const messageId = crypto.randomUUID();

    let payload: Record<string, string | boolean | null>;
    let channel: string;

    if (registration_method === 'email') {
      // Send email welcome message
      const emailHtml = generateWelcomeEmailHtml(first_name);
      payload = {
        to: email,
        cc: null,
        bcc: null,
        subject: 'Welcome to MonToit! 🏠',
        content: emailHtml,
        ishtml: true,
        username: azureUsername,
        password: azurePassword,
        from: azureFrom,
        channel: 'Email'
      };
      channel = 'email';
      console.log(`[welcome-message] Sending welcome email to ${email}...`);
    } else {
      // Send SMS welcome message
      const smsMessage = generateWelcomeSms(first_name);
      payload = {
        to: phone,
        content: smsMessage,
        username: azureUsername,
        password: azurePassword,
        from: azureFrom,
        channel: 'SMS'
      };
      channel = 'sms';
      console.log(`[welcome-message] Sending welcome SMS to ${phone}...`);
    }

    const azureResponse = await fetch(messageUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const responseText = await azureResponse.text();

    if (!azureResponse.ok) {
      console.error('[welcome-message] Azure error:', {
        status: azureResponse.status,
        statusText: azureResponse.statusText,
        body: responseText,
      });

      return new Response(
        JSON.stringify({
          status: 'error',
          reason: `Failed to send ${channel} message`
        }),
        { status: azureResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[welcome-message] Welcome ${channel} sent successfully to ${registration_method === 'email' ? email : phone}`);

    const response: WelcomeMessageResponse = {
      status: 'ok',
      channel_used: channel,
      message_id: messageId
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[welcome-message] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        status: 'error',
        reason: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
