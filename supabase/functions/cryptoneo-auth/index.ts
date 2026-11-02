import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory cache for JWT token
let cachedToken: { token: string; expiresAt: number } | null = null;

const CRYPTONEO_APP_KEY = Deno.env.get('CRYPTONEO_APP_KEY');
const CRYPTONEO_APP_SECRET = Deno.env.get('CRYPTONEO_APP_SECRET');
const CRYPTONEO_BASE_URL = Deno.env.get('CRYPTONEO_BASE_URL');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if we have a valid cached token (expires in 55 minutes)
    const now = Date.now();
    if (cachedToken && cachedToken.expiresAt > now) {
      console.log('Returning cached CryptoNeo JWT token');
      return new Response(
        JSON.stringify({ token: cachedToken.token }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching new CryptoNeo JWT token');

    // Retry logic with exponential backoff
    let retries = 0;
    const maxRetries = 3;
    let response;
    
    while (retries < maxRetries) {
      try {
        response = await fetch(`${CRYPTONEO_BASE_URL}/user/auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appKey: CRYPTONEO_APP_KEY,
            appSecret: CRYPTONEO_APP_SECRET
          })
        });

        if (response.ok) break;

        const errorData = await response.json();
        console.error(`CryptoNeo auth attempt ${retries + 1} failed:`, errorData);
        
        if (response.status === 401 || response.status === 403) {
          return new Response(
            JSON.stringify({ error: 'Invalid CryptoNeo credentials' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

      } catch (error) {
        console.error(`CryptoNeo auth attempt ${retries + 1} error:`, error);
      }

      retries++;
      if (retries < maxRetries) {
        const delay = Math.pow(2, retries) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    if (!response || !response.ok) {
      return new Response(
        JSON.stringify({ error: 'CryptoNeo API unavailable after retries' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // CryptoNeo retourne le token dans data.data.token
    const token = data.data?.token || data.token;
    
    if (!token) {
      console.error('CryptoNeo response:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: 'No token in CryptoNeo response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cache token for 55 minutes
    cachedToken = {
      token: token,
      expiresAt: now + (55 * 60 * 1000)
    };

    console.log('CryptoNeo JWT token cached successfully');

    return new Response(
      JSON.stringify({ token: token }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in cryptoneo-auth:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
