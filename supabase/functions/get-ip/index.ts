/**
 * Edge Function temporaire pour obtenir l'IP publique
 * Utilise l'anon key via paramètre URL
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info',
};

const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Méthode 1: via ipify
    const ipifyResponse = await fetch('https://api.ipify.org?format=json');
    const ipifyData = await ipifyResponse.json();
    const ip = ipifyData.ip;

    return new Response(
      JSON.stringify({
        ip,
        anon_key_provided: !!ANON_KEY,
        region: 'eu-west-3',
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Failed to get IP',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
