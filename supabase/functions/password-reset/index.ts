/**
 * Edge Function: password-reset
 *
 * Demande de réinitialisation de mot de passe par email.
 * Utilise l'API REST Supabase Auth pour éviter les problèmes de JWT.
 */

const ALLOWED_ORIGINS = [
  'https://mon-toit.ansut.ci',
  'https://montoit.ansut.ci',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const DEFAULT_ORIGIN = ALLOWED_ORIGINS[0];

/**
 * Get CORS headers for the response
 */
function getCorsHeaders(origin: string | null): Record<string, string> {
  const corsOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : DEFAULT_ORIGIN;

  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info',
    'Access-Control-Max-Age': '86400',
  };
}

serve(async (req: Request) => {
  // Get origin early for all responses
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight request immediately
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Only POST is allowed
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed', errorCode: 'METHOD_NOT_ALLOWED' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Parse request body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body', errorCode: 'INVALID_JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, siteUrl } = body || {};

    // Validate email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email address', errorCode: 'INVALID_EMAIL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Get Supabase configuration
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('VITE_SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
                     ?? Deno.env.get('SUPABASE_ANON_KEY')
                     ?? Deno.env.get('VITE_SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('[password-reset] Missing config:', { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey });
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error', errorCode: 'SERVER_CONFIG_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine redirect URL
    const redirectBase = siteUrl ?? Deno.env.get('SITE_URL') ?? 'http://localhost:8080';
    const redirectTo = `${redirectBase}/reinitialiser-mot-de-passe`;

    console.log('[password-reset] Processing:', { email: normalizedEmail, redirectTo });

    // Call Supabase Auth REST API
    const apiUrl = `${supabaseUrl}/auth/v1/recover`;
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        email: normalizedEmail,
        gotrue_meta_security: { redirectTo }
      }),
    });

    const responseText = await apiResponse.text();
    console.log('[password-reset] API response:', apiResponse.status, responseText.substring(0, 200));

    // Handle API errors
    if (!apiResponse.ok) {
      // For security, always return success for 4xx errors (don't reveal if email exists)
      if (apiResponse.status < 500) {
        return new Response(
          JSON.stringify({
            success: true,
            message: "Si cet email est enregistré, vous recevrez un lien de réinitialisation sous peu.",
            sent: false
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 5xx errors are real server errors
      return new Response(
        JSON.stringify({ success: false, error: 'Temporary server error', errorCode: 'API_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[password-reset] Email sent successfully to:', normalizedEmail);

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Si cet email est enregistré, vous recevrez un lien de réinitialisation sous peu.",
        sent: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[password-reset] Unhandled error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: 'Unexpected server error', errorCode: 'INTERNAL_SERVER_ERROR', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
