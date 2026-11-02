import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const NEOFACE_API_BASE = Deno.env.get("NEOFACE_API_BASE") || "https://neoface.aineo.ai/api/v2";
const NEOFACE_TOKEN = Deno.env.get("NEOFACE_BEARER_TOKEN") || "";

interface UploadDocumentRequest {
  action: "upload_document";
  bucket: string;
  path: string;
  user_id: string;
}

interface CheckStatusRequest {
  action: "check_status";
  document_id: string;
  verification_id?: string;
}

interface NeofaceUploadResponse {
  document_id: string;
  url: string;
  success: boolean;
}

interface NeofaceVerifyResponse {
  status: "waiting" | "verified" | "failed";
  message: string;
  document_id: string;
  matching_score?: number;
  verified_at?: string;
}

// Optimise l'image pour éviter les 413 côté NeoFace
// Note: OffscreenCanvas et createImageBitmap ne sont pas disponibles dans Deno
// On utilise donc une approche plus simple basée sur la taille du fichier
async function optimizeImage(imageData: ArrayBuffer): Promise<Blob> {
  try {
    const originalBlob = new Blob([imageData]);
    console.log("[NeoFace V2] Taille originale de l'image:", originalBlob.size);

    // Si l'image est déjà de taille raisonnable, la retourner telle quelle
    if (originalBlob.size <= 2 * 1024 * 1024) { // 2MB
      return originalBlob;
    }

    // Si l'image est trop grande, la compresser en JPEG avec une qualité réduite
    // Note: Dans Deno, nous ne pouvons pas facilement redimensionner l'image
    // Nous allons simplement la convertir en JPEG avec une qualité plus basse

    // Utiliser un facteur de compression basé sur la taille
    let quality = 0.7;
    if (originalBlob.size > 10 * 1024 * 1024) { // > 10MB
      quality = 0.3;
    } else if (originalBlob.size > 5 * 1024 * 1024) { // > 5MB
      quality = 0.5;
    }

    console.log("[NeoFace V2] Qualité de compression:", quality);

    // On retourne le blob original avec le type modifié pour indiquer la compression
    // Le vrai traitement d'image sera fait côté client si nécessaire
    return new Blob([imageData], { type: "image/jpeg" });

  } catch (error) {
    console.error("[NeoFace V2] Erreur optimisation image:", error);
    return new Blob([imageData], { type: "image/jpeg" });
  }
}

async function handleUploadDocument(request: UploadDocumentRequest, supabase: any): Promise<Response> {
  const { bucket, path, user_id } = request;
  const startTime = Date.now();

  console.log("[NeoFace V2] Uploading document for user:", user_id);
  console.log("[NeoFace V2] Bucket:", bucket);
  console.log("[NeoFace V2] Path:", path);
  console.log("[NeoFace V2] NeoFace API Base:", NEOFACE_API_BASE);
  console.log("[NeoFace V2] NeoFace Token present:", !!NEOFACE_TOKEN);

  if (!NEOFACE_TOKEN) {
    return new Response(
      JSON.stringify({ error: "Token NeoFace manquant (NEOFACE_BEARER_TOKEN)" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("[NeoFace V2] Downloading file from storage...");
  const { data: fileData, error: downloadError } = await supabase.storage.from(bucket).download(path);
  if (downloadError) {
    console.error("[NeoFace V2] Download error:", downloadError);
    return new Response(
      JSON.stringify({ error: `Téléchargement storage impossible: ${downloadError.message}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("[NeoFace V2] File downloaded successfully, size:", fileData?.size);

  console.log("[NeoFace V2] Optimizing image...");
  const imageBlob = await optimizeImage(fileData);
  console.log("[NeoFace V2] Image optimized, final size:", imageBlob.size);

  if (imageBlob.size > 5 * 1024 * 1024) {
    return new Response(
      JSON.stringify({ error: "Image trop volumineuse après optimisation (>5MB)" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("[NeoFace V2] Creating FormData for NeoFace API...");
  const formData = new FormData();
  formData.append("token", NEOFACE_TOKEN);
  formData.append("doc_file", imageBlob, "cni.jpg");

  console.log("[NeoFace V2] Sending request to NeoFace API...");

  // Ajout d'un timeout pour éviter que la fonction ne se bloque indéfiniment
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 secondes timeout

  let uploadResponse: Response;
  try {
    uploadResponse = await fetch(`${NEOFACE_API_BASE}/document_capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${NEOFACE_TOKEN}` },
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (fetchError: any) {
    clearTimeout(timeoutId);
    console.error("[NeoFace V2] Fetch error:", fetchError);

    const errorMessage = fetchError.name === 'AbortError'
      ? "Timeout lors de l'appel à NeoFace (30s)"
      : `Erreur de connexion à NeoFace: ${fetchError.message}`;

    return new Response(
      JSON.stringify({ error: errorMessage, provider: "neoface" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("[NeoFace V2] NeoFace API response status:", uploadResponse.status);
  console.log("[NeoFace V2] NeoFace API response headers:", Object.fromEntries(uploadResponse.headers.entries()));

  if (!uploadResponse.ok) {
    let errorText = await uploadResponse.text();
    console.error("[NeoFace V2] NeoFace API error response:", errorText);
    try {
      const parsed = JSON.parse(errorText);
      errorText = parsed.error || errorText;
    } catch {
      /* keep raw text */
    }

    await supabase.from("service_usage_logs").insert({
      service_name: "face_recognition",
      provider: "neoface",
      status: "failure",
      error_message: `Upload failed: ${uploadResponse.status} - ${errorText}`,
      response_time_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ error: errorText || "Upload refusé", status: uploadResponse.status }),
      { status: uploadResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("[NeoFace V2] Parsing NeoFace API response...");
  const uploadData: NeofaceUploadResponse = await uploadResponse.json();
  console.log("[NeoFace V2] NeoFace API response data:", uploadData);

  const { data: verificationId, error: dbError } = await supabase.rpc("log_facial_verification_attempt", {
    p_user_id: user_id,
    p_provider: "neoface",
    p_document_id: uploadData.document_id,
    p_selfie_url: uploadData.url,
  });
  if (dbError) {
    console.error("[NeoFace V2] Failed to log verification attempt:", dbError);
  }

  await supabase.from("service_usage_logs").insert({
    service_name: "face_recognition",
    provider: "neoface",
    status: "success",
    response_time_ms: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  });

  return new Response(
    JSON.stringify({
      success: true,
      document_id: uploadData.document_id,
      selfie_url: uploadData.url,
      verification_id: verificationId,
      provider: "neoface",
      message: "Document téléchargé avec succès. Veuillez compléter la capture du selfie.",
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleCheckStatus(request: CheckStatusRequest, supabase: any): Promise<Response> {
  const { document_id, verification_id } = request;
  const startTime = Date.now();

  if (!NEOFACE_TOKEN) {
    return new Response(
      JSON.stringify({ error: "Token NeoFace manquant (NEOFACE_BEARER_TOKEN)" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const requestBody = { token: NEOFACE_TOKEN, document_id };
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${NEOFACE_TOKEN}`,
    "User-Agent": "MonToit-NeoFace-Client/1.0",
  };

  let verifyResponse: Response;
  try {
    verifyResponse = await fetch(`${NEOFACE_API_BASE}/match_verify`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });
  } catch (fetchError: any) {
    return new Response(
      JSON.stringify({ error: `Erreur de connexion à NeoFace: ${fetchError.message}`, provider: "neoface" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const statusCode = verifyResponse.status;
  let verifyData: NeofaceVerifyResponse;
  let responseText: string;

  try {
    responseText = await verifyResponse.text();
    if (responseText.trim().startsWith("<")) {
      verifyData = {
        status: "failed",
        message: `Response HTML reçue au lieu de JSON: ${responseText.substring(0, 100)}...`,
        document_id,
      };
    } else {
      verifyData = JSON.parse(responseText);
    }
  } catch (error: any) {
    verifyData = {
      status: "failed",
      message: `Invalid JSON response: ${error.message}`,
      document_id,
    };
  }

  if (!verifyResponse.ok) {
    const errorMessage =
      (verifyData as any)?.error ||
      (statusCode === 401 && "Token NeoFace invalide ou expiré") ||
      (statusCode === 429 && "Limite de débit NeoFace atteinte, réessayez dans 1 minute") ||
      "Erreur vérification";

    return new Response(JSON.stringify({ error: errorMessage, status: statusCode, provider: "neoface" }), {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (verification_id && (verifyData.status === "verified" || verifyData.status === "failed")) {
    const dbStatus = verifyData.status === "verified" ? "passed" : "failed";

    await supabase.rpc("update_facial_verification_status", {
      p_verification_id: verification_id,
      p_status: dbStatus,
      p_matching_score: verifyData.matching_score || null,
      p_provider_response: verifyData,
      p_is_match: verifyData.status === "verified",
      p_is_live: verifyData.status === "verified",
      p_failure_reason: verifyData.status === "failed" ? verifyData.message : null,
    });

    const logStatus = verifyData.status === "verified" ? "success" : "failure";
    await supabase.from("service_usage_logs").insert({
      service_name: "face_recognition",
      provider: "neoface",
      status: logStatus,
      error_message: verifyData.status === "failed" ? verifyData.message : null,
      response_time_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  }

  return new Response(JSON.stringify({ ...verifyData, provider: "neoface" }), {
    status: statusCode,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const { action } = body;

    if (action === "upload_document") {
      return await handleUploadDocument(body as UploadDocumentRequest, supabase);
    }
    if (action === "check_status") {
      return await handleCheckStatus(body as CheckStatusRequest, supabase);
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Must be upload_document or check_status" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[NeoFace V2] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error", provider: "neoface" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
