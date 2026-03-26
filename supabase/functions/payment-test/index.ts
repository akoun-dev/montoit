/**
 * Edge Function de test pour vérifier la connectivité InTouch
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, apikey',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env_vars: {},
    connectivity_test: {},
  };

  // 1. Vérifier les variables d'environnement
  const envVars = {
    INTOUCH_BASE_URL: Deno.env.get('INTOUCH_BASE_URL'),
    VITE_INTOUCH_BASE_URL: Deno.env.get('VITE_INTOUCH_BASE_URL'),
    INTOUCH_USERNAME: Deno.env.get('INTOUCH_USERNAME')?.substring(0, 20) + '...',
    VITE_INTOUCH_USERNAME: Deno.env.get('VITE_INTOUCH_USERNAME')?.substring(0, 20) + '...',
    INTOUCH_PASSWORD: Deno.env.get('INTOUCH_PASSWORD') ? 'SET' : 'NOT_SET',
    VITE_INTOUCH_PASSWORD: Deno.env.get('VITE_INTOUCH_PASSWORD') ? 'SET' : 'NOT_SET',
    INTOUCH_PARTNER_ID: Deno.env.get('INTOUCH_PARTNER_ID'),
    INTOUCH_LOGIN_API: Deno.env.get('INTOUCH_LOGIN_API'),
    INTOUCH_PASSWORD_API: Deno.env.get('INTOUCH_PASSWORD_API') ? 'SET' : 'NOT_SET',
    SUPABASE_URL: Deno.env.get('SUPABASE_URL')?.substring(0, 30) + '...',
    SITE_URL: Deno.env.get('SITE_URL'),
  };

  results.env_vars = envVars;

  // 2. Tester la connectivité avec InTouch
  const baseUrl = envVars.INTOUCH_BASE_URL || envVars.VITE_INTOUCH_BASE_URL;
  const username = Deno.env.get('INTOUCH_USERNAME') || Deno.env.get('VITE_INTOUCH_USERNAME') || '';
  const password = Deno.env.get('INTOUCH_PASSWORD') || Deno.env.get('VITE_INTOUCH_PASSWORD') || '';
  const agencyCode = 'ANSUT13287';

  if (baseUrl) {
    const endpoint = `${baseUrl}/${agencyCode}/cashin`;
    const auth = btoa(`${username}:${password}`);

    results.connectivity_test = {
      endpoint,
      auth_header: auth.substring(0, 10) + '...',
      has_username: !!username,
      has_password: !!password,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
        body: JSON.stringify({
          service_id: 'CASHINMTNPART2',
          recipient_phone_number: '0700000000',
          amount: 100,
          partner_id: 'CI300373',
          partner_transaction_id: `TEST_${Date.now()}`,
          login_api: '07084598370',
          password_api: 'TEST',
          call_back_url: 'https://test.com',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      results.connectivity_test.response = {
        status: response.status,
        statusText: response.statusText,
        body: responseText.substring(0, 500),
      };
    } catch (error) {
      results.connectivity_test.error = {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return new Response(
    JSON.stringify(results, null, 2),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
