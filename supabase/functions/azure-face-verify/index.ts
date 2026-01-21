import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FaceVerifyRequest {
  selfieUrl: string;
  idPhotoUrl: string;
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

    const { selfieUrl, idPhotoUrl, userId } = await req.json() as FaceVerifyRequest;

    if (!selfieUrl || !idPhotoUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: selfieUrl, idPhotoUrl' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: apiKeys, error: keyError } = await supabaseClient.rpc('get_api_keys', { service: 'azure_face' });

    if (keyError || !apiKeys || !apiKeys.api_key) {
      throw new Error('Azure Face API key not configured: ' + (keyError?.message || 'No key found'));
    }

    const apiKey = apiKeys.api_key;
    const endpoint = apiKeys.endpoint;

    const detectFace = async (imageUrl: string): Promise<string> => {
      const response = await fetch(
        `${endpoint}/face/v1.0/detect?returnFaceId=true`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: imageUrl }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Face detection failed: ${response.status} - ${errorText}`);
      }

      const faces = await response.json();

      if (!faces || faces.length === 0) {
        throw new Error('No face detected');
      }

      if (faces.length > 1) {
        throw new Error('Multiple faces detected');
      }

      return faces[0].faceId;
    };

    const selfieFaceId = await detectFace(selfieUrl);
    const idPhotoFaceId = await detectFace(idPhotoUrl);

    const verifyResponse = await fetch(
      `${endpoint}/face/v1.0/verify`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          faceId1: selfieFaceId,
          faceId2: idPhotoFaceId,
        }),
      }
    );

    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();
      throw new Error(`Face verification failed: ${verifyResponse.status} - ${errorText}`);
    }

    const verifyResult = await verifyResponse.json();

    const verified = verifyResult.isIdentical && verifyResult.confidence > 0.7;

    await supabaseClient.rpc('log_api_usage', {
      p_service_name: 'azure_face',
      p_action: 'verify_identity',
      p_status: 'success',
      p_request_data: { selfieUrl, idPhotoUrl, userId },
      p_response_data: verifyResult,
      p_user_id: userId || null
    });

    return new Response(
      JSON.stringify({
        success: true,
        verified,
        isIdentical: verifyResult.isIdentical,
        confidence: verifyResult.confidence,
        message: verified
          ? 'Identité vérifiée avec succès'
          : verifyResult.isIdentical
          ? 'Faible niveau de confiance'
          : 'Les visages ne correspondent pas',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in face verification:', error);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabaseClient.rpc('log_api_usage', {
      p_service_name: 'azure_face',
      p_action: 'verify_identity',
      p_status: 'error',
      p_error_message: error.message
    });

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
