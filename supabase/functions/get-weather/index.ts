import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const WEATHER_ICONS: Record<string, string> = {
  '01d': 'sun', '01n': 'moon',
  '02d': 'cloud-sun', '02n': 'cloud-moon',
  '03d': 'cloud', '03n': 'cloud',
  '04d': 'cloud', '04n': 'cloud',
  '09d': 'cloud-rain', '09n': 'cloud-rain',
  '10d': 'cloud-rain', '10n': 'cloud-rain',
  '11d': 'cloud-lightning', '11n': 'cloud-lightning',
  '13d': 'snowflake', '13n': 'snowflake',
  '50d': 'cloud', '50n': 'cloud'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    // Handle CORS preflight
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { city = 'Abidjan' } = await req.json();
    const apiKey = Deno.env.get('OPENWEATHER_API_KEY');

    // Fallback if no API key
    if (!apiKey) {
      console.log('No OpenWeather API key found, using fallback data');
      return new Response(
        JSON.stringify({
          weather: {
            temperature: 28,
            description: 'Ensoleillé',
            icon: 'sun',
            humidity: 75,
            windSpeed: 12
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=fr`
    );

    if (!response.ok) {
      throw new Error('Weather API request failed');
    }

    const data = await response.json();
    
    const weather = {
      temperature: Math.round(data.main.temp),
      description: data.weather[0].description.charAt(0).toUpperCase() + data.weather[0].description.slice(1),
      icon: WEATHER_ICONS[data.weather[0].icon] || 'sun',
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed * 3.6) // m/s to km/h
    };

    console.log('Weather fetched successfully:', weather);

    return new Response(
      JSON.stringify({ weather }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching weather:', error);
    
    // Return fallback data on error
    return new Response(
      JSON.stringify({
        weather: {
          temperature: 28,
          description: 'Belle journée',
          icon: 'sun',
          humidity: 75,
          windSpeed: 12
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
