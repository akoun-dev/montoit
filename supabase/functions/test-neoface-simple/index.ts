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
    console.log('[TEST SIMPLE] Test de base de NeoFace');

    // 1. Test du document capture avec une image de test
    console.log('[TEST SIMPLE] Étape 1: Test document_capture');

    // Créer une image de test 1x1 pixel en base64
    const testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

    const uploadResponse = await fetch(`${NEOFACE_API_BASE}/document_capture`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NEOFACE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: NEOFACE_TOKEN,
        doc_file: {
          name: "test.jpg",
          data: testImageBase64,
          mime_type: "image/jpeg"
        }
      }),
    });

    console.log('[TEST SIMPLE] Upload status:', uploadResponse.status);
    const uploadText = await uploadResponse.text();
    console.log('[TEST SIMPLE] Upload response:', uploadText);

    if (!uploadResponse.ok) {
      return new Response(
        JSON.stringify({
          error: "Document capture failed",
          status: uploadResponse.status,
          response: uploadText
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }}
      );
    }

    let uploadData;
    try {
      uploadData = JSON.parse(uploadText);
    } catch (e) {
      return new Response(
        JSON.stringify({
          error: "Invalid JSON response from document capture",
          raw_response: uploadText
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }}
      );
    }

    // 2. Vérifier l'URL retournée
    if (!uploadData.url) {
      return new Response(
        JSON.stringify({
          error: "No URL returned from document capture",
          response: uploadData
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }}
      );
    }

    console.log('[TEST SIMPLE] URL retournée:', uploadData.url);
    console.log('[TEST SIMPLE] Document ID:', uploadData.document_id);

    // 3. Test du match verify avec le document ID
    console.log('[TEST SIMPLE] Étape 2: Test match_verify');

    const verifyResponse = await fetch(`${NEOFACE_API_BASE}/match_verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${NEOFACE_TOKEN}`,
      },
      body: JSON.stringify({
        token: NEOFACE_TOKEN,
        document_id: uploadData.document_id,
      }),
    });

    console.log('[TEST SIMPLE] Verify status:', verifyResponse.status);
    const verifyText = await verifyResponse.text();
    console.log('[TEST SIMPLE] Verify response:', verifyText);

    let verifyData;
    try {
      verifyData = JSON.parse(verifyText);
    } catch (e) {
      verifyData = { raw_response: verifyText };
    }

    // 4. Analyser les résultats
    const analysis = {
      upload_success: uploadResponse.ok,
      upload_status: uploadResponse.status,
      document_id: uploadData.document_id,
      selfie_url: uploadData.url,
      verify_success: verifyResponse.ok,
      verify_status: verifyResponse.status,
      verify_result: verifyData,
      token_present: !!NEOFACE_TOKEN,
      token_length: NEOFACE_TOKEN?.length || 0,
    };

    // Diagnostic simple
    let diagnostic = "❓ Résultat indéterminé";
    if (uploadResponse.ok && verifyResponse.status === 201) {
      diagnostic = "✅ Token valide, API fonctionnelle";
    } else if (uploadResponse.status === 401 || verifyResponse.status === 401) {
      diagnostic = "❌ Token invalide ou expiré";
    } else if (uploadResponse.status === 403 || verifyResponse.status === 403) {
      diagnostic = "❌ Accès refusé (IP bloquée ou token incorrect)";
    } else if (uploadResponse.status === 429 || verifyResponse.status === 429) {
      diagnostic = "⚠️ Rate limiting activé";
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysis,
        diagnostic: diagnostic,
        recommendation: diagnostic.includes("❌") ? "Vérifiez le token ou contactez NeoFace" : "L'API fonctionne correctement",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('[TEST SIMPLE] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        error_name: error.name,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});