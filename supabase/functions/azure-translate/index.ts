import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TranslateRequest {
  text: string | string[];
  targetLanguage: string;
  sourceLanguage?: string;
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

    const { text, targetLanguage, sourceLanguage, userId } = await req.json() as TranslateRequest;

    if (!text || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: text, targetLanguage' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: apiKeys, error: keyError } = await supabaseClient.rpc('get_api_keys', { service: 'azure_translator' });

    if (keyError || !apiKeys || !apiKeys.api_key) {
      throw new Error('Azure Translator API key not configured');
    }

    const apiKey = apiKeys.api_key;
    const endpoint = apiKeys.endpoint || 'https://api.cognitive.microsofttranslator.com';
    const region = apiKeys.region || 'global';

    const params = new URLSearchParams({
      'api-version': '3.0',
      to: targetLanguage,
    });

    if (sourceLanguage) {
      params.append('from', sourceLanguage);
    }

    const textsArray = Array.isArray(text) ? text : [text];
    const body = textsArray.map(t => ({ text: t }));

    const response = await fetch(`${endpoint}/translate?${params}`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Ocp-Apim-Subscription-Region': region,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure Translator error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    const results = data.map((translation: any, index: number) => ({
      originalText: textsArray[index],
      translatedText: translation.translations[0].text,
      sourceLanguage: translation.detectedLanguage?.language || sourceLanguage || 'unknown',
      targetLanguage,
      confidence: translation.detectedLanguage?.score || 1.0,
    }));

    await supabaseClient.rpc('log_api_usage', {
      p_service_name: 'azure_translator',
      p_action: 'translate',
      p_status: 'success',
      p_request_data: { targetLanguage, count: textsArray.length },
      p_user_id: userId || null
    });

    return new Response(
      JSON.stringify({
        success: true,
        results: Array.isArray(text) ? results : results[0],
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in translation:', error);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabaseClient.rpc('log_api_usage', {
      p_service_name: 'azure_translator',
      p_action: 'translate',
      p_status: 'error',
      p_error_message: error.message
    });

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
