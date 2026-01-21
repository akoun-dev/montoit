import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TTSRequest {
  text: string;
  voice?: string;
  language?: string;
  speakingRate?: number;
  pitch?: number;
  userId?: string;
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

    const {
      text,
      voice = 'fr-FR-DeniseNeural',
      language = 'fr-FR',
      speakingRate = 1.0,
      pitch = 1.0,
      userId
    } = await req.json() as TTSRequest;

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: text' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: apiKeys, error: keyError } = await supabaseClient.rpc('get_api_keys', { service: 'azure_speech_tts' });

    if (keyError || !apiKeys || !apiKeys.api_key) {
      throw new Error('Azure Speech TTS API key not configured');
    }

    const apiKey = apiKeys.api_key;
    const region = apiKeys.region || 'eastus';
    const endpoint = apiKeys.endpoint || `https://${region}.tts.speech.microsoft.com`;

    const escapeXml = (str: string) => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    const pitchChange = pitch > 1 ? `+${(pitch - 1) * 50}%` : `${(pitch - 1) * 50}%`;

    const ssml = `
      <speak version='1.0' xml:lang='${language}'>
        <voice xml:lang='${language}' name='${voice}'>
          <prosody rate='${speakingRate}' pitch='${pitchChange}'>
            ${escapeXml(text)}
          </prosody>
        </voice>
      </speak>
    `;

    const response = await fetch(
      `${endpoint}/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
        },
        body: ssml,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure Speech TTS error: ${response.status} - ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();

    await supabaseClient.rpc('log_api_usage', {
      p_service_name: 'azure_speech_tts',
      p_action: 'text_to_speech',
      p_status: 'success',
      p_request_data: { textLength: text.length, voice, language },
      p_user_id: userId || null
    });

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error in text-to-speech:', error);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabaseClient.rpc('log_api_usage', {
      p_service_name: 'azure_speech_tts',
      p_action: 'text_to_speech',
      p_status: 'error',
      p_error_message: error.message
    });

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
