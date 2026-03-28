/**
 * Edge Function: password-reset
 *
 * Demande de réinitialisation de mot de passe par email.
 * Utilise l'API REST Supabase Auth pour éviter les problèmes de JWT.
 */

const DEFAULT_ALLOWED_ORIGINS = [
  'https://mon-toit.ansut.ci',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true; // Allow same-origin requests
  return DEFAULT_ALLOWED_ORIGINS.includes(origin);
}

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  const allowedOrigins = DEFAULT_ALLOWED_ORIGINS;

  // Find matching origin
  const corsOrigin = origin && allowedOrigins.includes(origin)
    ? origin
    : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info',
    'Access-Control-Max-Age': '86400',
  };
}

interface ResetRequest {
  email: string;
  siteUrl?: string;
}

interface ErrorResponse {
  success: false;
  error: string;
  errorCode?: string;
}

// Helper pour les réponses d'erreur standardisées
function createError(status: number, message: string, code?: string): Response {
  const body: ErrorResponse = {
    success: false,
    error: message,
    errorCode: code,
  };
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': DEFAULT_ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info',
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // 1. Gestion CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // 2. Validation de la méthode
    if (req.method !== 'POST') {
      return createError(405, 'Méthode non autorisée', 'METHOD_NOT_ALLOWED');
    }

    const body = await req.json();
    const { email, siteUrl }: ResetRequest = body;

    // 3. Validation des entrées
    if (!email || !email.includes('@')) {
      return createError(400, 'Adresse email invalide', 'INVALID_EMAIL');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 4. Configuration Environnement
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
                        Deno.env.get('SUPABASE_ANON_KEY') ||
                        Deno.env.get('VITE_SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('[password-reset] Configuration manquante:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
      });
      return createError(500, 'Configuration serveur invalide', 'SERVER_CONFIG_ERROR');
    }

    // 5. Détermination de l'URL de redirection
    const redirectBase = siteUrl
      ? siteUrl
      : Deno.env.get('SITE_URL') || 'http://localhost:8080';

    const redirectTo = `${redirectBase}/reinitialiser-mot-de-passe`;

    console.log('[password-reset] Demande pour:', normalizedEmail);
    console.log('[password-reset] Redirection vers:', redirectTo);

    // 6. Appel API REST Supabase Auth (évite les problèmes de JWT)
    const apiUrl = `${supabaseUrl}/auth/v1/recover`;
    const requestBody = JSON.stringify({ email: normalizedEmail, gotrue_meta_security: { redirectTo } });

    console.log('[password-reset] Appel API REST:', apiUrl);

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: requestBody,
    });

    console.log('[password-reset] Réponse API:', apiResponse.status);

    const responseData = await apiResponse.text();
    console.log('[password-reset] Corps réponse:', responseData.substring(0, 200));

    // 7. Gestion des erreurs de l'API
    if (!apiResponse.ok) {
      console.error('[password-reset] Erreur API Supabase:', apiResponse.status, responseData);

      // Pour la sécurité, on retourne toujours succès même si l'email n'existe pas
      // Sauf pour les erreurs système
      if (apiResponse.status >= 500) {
        return createError(500, 'Erreur serveur temporaire', 'API_ERROR');
      }

      // Pour les autres erreurs (4xx), on retourne un succès fictif
      return new Response(JSON.stringify({
        success: true,
        message: "Si cet email est enregistré, vous recevrez un lien de réinitialisation sous peu.",
        sent: false
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('[password-reset] Email envoyé avec succès à:', normalizedEmail);

    // 8. Réponse Succès
    return new Response(JSON.stringify({
      success: true,
      message: "Si cet email est enregistré, vous recevrez un lien de réinitialisation sous peu.",
      sent: true
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (globalError: unknown) {
    console.error('[password-reset] Erreur globale non gérée:', globalError);
    const message = globalError instanceof Error ? globalError.message : 'Erreur inconnue';
    return createError(500, 'Erreur serveur inattendue', 'INTERNAL_SERVER_ERROR');
  }
});
