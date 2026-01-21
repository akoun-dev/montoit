import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GeocodeRequest {
  address?: string;
  latitude?: number;
  longitude?: number;
  reverse?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { address, latitude, longitude, reverse = false } = await req.json() as GeocodeRequest;

    if (!reverse && !address) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (reverse && (latitude === undefined || longitude === undefined)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: latitude, longitude' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: apiKeys, error: keyError } = await supabaseClient.rpc('get_api_keys', { service: 'azure_maps' });

    if (keyError || !apiKeys || !apiKeys.subscription_key) {
      throw new Error('Azure Maps API key not configured');
    }

    const subscriptionKey = apiKeys.subscription_key;

    let url: string;
    let operation: string;

    if (reverse) {
      url = `https://atlas.microsoft.com/search/address/reverse/json?api-version=1.0&subscription-key=${subscriptionKey}&query=${latitude},${longitude}`;
      operation = 'reverse_geocode';
    } else {
      url = `https://atlas.microsoft.com/search/address/json?api-version=1.0&subscription-key=${subscriptionKey}&query=${encodeURIComponent(address!)}`;
      operation = 'geocode';
    }

    const response = await fetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Azure Maps error: ${response.status}`);
    }

    const data = await response.json();

    let result;
    if (reverse) {
      if (!data.addresses || data.addresses.length === 0) {
        throw new Error('Adresse non trouvée');
      }
      const addr = data.addresses[0];
      result = {
        latitude,
        longitude,
        address: addr.address.freeformAddress,
        confidence: addr.confidence,
      };
    } else {
      if (!data.results || data.results.length === 0) {
        throw new Error('Adresse non trouvée');
      }
      const res = data.results[0];
      result = {
        latitude: res.position.lat,
        longitude: res.position.lon,
        address: res.address.freeformAddress,
        confidence: res.score.toString(),
      };
    }

    await supabaseClient.rpc('log_api_usage', {
      p_service_name: 'azure_maps',
      p_action: operation,
      p_status: 'success',
      p_request_data: reverse ? { latitude, longitude } : { address }
    });

    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in geocoding:', error);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabaseClient.rpc('log_api_usage', {
      p_service_name: 'azure_maps',
      p_action: 'geocode',
      p_status: 'error',
      p_error_message: error.message
    });

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
