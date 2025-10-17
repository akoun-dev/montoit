import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address, city } = await req.json();
    
    console.log('Geocoding request:', { address, city });

    if (!address || !city) {
      return new Response(
        JSON.stringify({ error: 'Address and city are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const MAPBOX_TOKEN = Deno.env.get('MAPBOX_PUBLIC_TOKEN');
    
    if (!MAPBOX_TOKEN) {
      console.error('MAPBOX_PUBLIC_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Geocoding service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build search query
    const searchQuery = encodeURIComponent(`${address}, ${city}, Côte d'Ivoire`);
    
    // Call Mapbox Geocoding API
    const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${searchQuery}.json?access_token=${MAPBOX_TOKEN}&country=CI&limit=1`;
    
    const response = await fetch(geocodeUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mapbox API error:', response.status, errorText);
      throw new Error('Geocoding API error');
    }

    const data = await response.json();
    
    console.log('Mapbox response:', data);

    if (data.features && data.features.length > 0) {
      const [longitude, latitude] = data.features[0].center;
      
      return new Response(
        JSON.stringify({
          latitude,
          longitude,
          formatted_address: data.features[0].place_name
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Default to Abidjan center if no results
      console.log('No geocoding results, using default Abidjan coordinates');
      return new Response(
        JSON.stringify({
          latitude: 5.3599,
          longitude: -4.0305,
          formatted_address: `${address}, ${city}, Côte d'Ivoire`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in geocode-address function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
