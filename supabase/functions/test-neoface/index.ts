import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const NEOFACE_API_BASE = Deno.env.get("NEOFACE_API_BASE") || "https://neoface.aineo.ai/api/v2";
const NEOFACE_TOKEN = Deno.env.get("NEOFACE_BEARER_TOKEN") || "7JpTxE9Io6ZFIZN96bS8UZkkCbsC0h8kY4hXEVmVoYOZdPoC1TNOhWHyudUuOSQp";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('[TEST] Début du test de configuration NeoFace');
    console.log('[TEST] API Base URL:', NEOFACE_API_BASE);
    console.log('[TEST] Token présent:', NEOFACE_TOKEN ? 'OUI' : 'NON');
    console.log('[TEST] Token length:', NEOFACE_TOKEN?.length || 0);

    // Test simple : vérifier si le token est valide avec document_id fictif
    const testDocumentId = "doc-TEST123456789";

    const requestBody = {
      token: NEOFACE_TOKEN,
      document_id: testDocumentId,
    };

    console.log('[TEST] Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${NEOFACE_API_BASE}/match_verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${NEOFACE_TOKEN}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('[TEST] Response status:', response.status);
    console.log('[TEST] Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('[TEST] Response length:', responseText.length);
    console.log('[TEST] Response (first 500 chars):', responseText.substring(0, 500));

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { raw_response: responseText };
    }

    return new Response(
      JSON.stringify({
        success: true,
        test_results: {
          api_url: NEOFACE_API_BASE,
          token_present: !!NEOFACE_TOKEN,
          token_length: NEOFACE_TOKEN?.length || 0,
          response_status: response.status,
          response_status_text: response.statusText,
          response_headers: Object.fromEntries(response.headers.entries()),
          response_data: responseData,
          timestamp: new Date().toISOString(),
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('[TEST] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        error_name: error.name,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});