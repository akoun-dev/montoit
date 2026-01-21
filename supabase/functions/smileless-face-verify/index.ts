import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SMILELESS_API_BASE = "https://neoface.aineo.ai/api/v2";
const SMILELESS_TOKEN = Deno.env.get("SMILELESS_TOKEN") || "7JpTxE9Io6ZFIZN96bS8UZkkCbsC0h8kY4hXEVmVoYOZdPoC1TNOhWHyudUuOSQp";

interface UploadDocumentRequest {
  action: 'upload_document';
  cni_photo_url: string;
  user_id: string;
}

interface CheckStatusRequest {
  action: 'check_status';
  document_id: string;
  verification_id?: string;
}

interface SmilelessUploadResponse {
  document_id: string;
  url: string;
  success: boolean;
}

interface SmilelessVerifyResponse {
  status: 'waiting' | 'verified' | 'failed';
  message: string;
  document_id: string;
  matching_score?: number;
  verified_at?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? '',
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ''
    );

    const body = await req.json();
    const { action } = body;

    if (action === 'upload_document') {
      return await handleUploadDocument(body as UploadDocumentRequest, supabase);
    } else if (action === 'check_status') {
      return await handleCheckStatus(body as CheckStatusRequest, supabase);
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be upload_document or check_status' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error: any) {
    console.error('[Smileless] Error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        provider: 'smileless'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function handleUploadDocument(
  request: UploadDocumentRequest,
  supabase: any
): Promise<Response> {
  const { cni_photo_url, user_id } = request;

  console.log('[Smileless] Uploading document for user:', user_id);

  const imageResponse = await fetch(cni_photo_url);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image from URL: ${imageResponse.statusText}`);
  }

  const imageBlob = await imageResponse.blob();

  const formData = new FormData();
  formData.append("token", SMILELESS_TOKEN);
  formData.append("doc_file", imageBlob, "cni.jpg");

  const uploadResponse = await fetch(`${SMILELESS_API_BASE}/document_capture`, {
    method: "POST",
    body: formData,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error('[Smileless] Upload failed:', errorText);

    await supabase.from('service_usage_logs').insert({
      service_name: 'face_recognition',
      provider: 'smileless',
      status: 'failure',
      error_message: `Upload failed: ${uploadResponse.status} - ${errorText}`,
      timestamp: new Date().toISOString(),
    });

    throw new Error(`Smileless upload failed: ${uploadResponse.status} - ${errorText}`);
  }

  const uploadData: SmilelessUploadResponse = await uploadResponse.json();
  console.log('[Smileless] Document uploaded successfully:', uploadData.document_id);

  const { data: verificationId, error: dbError } = await supabase
    .rpc('log_facial_verification_attempt', {
      p_user_id: user_id,
      p_provider: 'smileless',
      p_document_id: uploadData.document_id,
      p_selfie_url: uploadData.url,
    });

  if (dbError) {
    console.error('[Smileless] Failed to log verification attempt:', dbError);
  }

  await supabase.from('service_usage_logs').insert({
    service_name: 'face_recognition',
    provider: 'smileless',
    status: 'success',
    response_time_ms: 0,
    timestamp: new Date().toISOString(),
  });

  return new Response(
    JSON.stringify({
      success: true,
      document_id: uploadData.document_id,
      selfie_url: uploadData.url,
      verification_id: verificationId,
      provider: 'smileless',
      message: 'Document uploaded successfully. Please complete selfie capture.',
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

async function handleCheckStatus(
  request: CheckStatusRequest,
  supabase: any
): Promise<Response> {
  const { document_id, verification_id } = request;

  console.log('[Smileless] Checking status for document:', document_id);

  const verifyResponse = await fetch(`${SMILELESS_API_BASE}/match_verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token: SMILELESS_TOKEN,
      document_id: document_id,
    }),
  });

  const statusCode = verifyResponse.status;
  const verifyData: SmilelessVerifyResponse = await verifyResponse.json();

  console.log('[Smileless] Verification status:', verifyData.status, 'Code:', statusCode);

  if (verification_id) {
    if (verifyData.status === 'verified' || verifyData.status === 'failed') {
      const dbStatus = verifyData.status === 'verified' ? 'passed' : 'failed';

      await supabase.rpc('update_facial_verification_status', {
        p_verification_id: verification_id,
        p_status: dbStatus,
        p_matching_score: verifyData.matching_score || null,
        p_provider_response: verifyData,
        p_is_match: verifyData.status === 'verified',
        p_is_live: verifyData.status === 'verified',
        p_failure_reason: verifyData.status === 'failed' ? verifyData.message : null,
      });

      const logStatus = verifyData.status === 'verified' ? 'success' : 'failure';
      await supabase.from('service_usage_logs').insert({
        service_name: 'face_recognition',
        provider: 'smileless',
        status: logStatus,
        error_message: verifyData.status === 'failed' ? verifyData.message : null,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return new Response(
    JSON.stringify({
      ...verifyData,
      provider: 'smileless',
    }),
    {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}
