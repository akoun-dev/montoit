/**
 * Edge Function Supabase pour la vérification ONECI
 *
 * Cette fonction sécurise les appels à l'API VERIF CI en gardant les credentials côté serveur.
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    FRONTEND (React)                              │
 * │  ┌─────────────────┐                                            │
 * │  │ useOneciVerification │ ── fetch() ──┐                        │
 * │  └─────────────────┘                  │                         │
 * └───────────────────────────────────────┼─────────────────────────┘
 *                                         │
 *                                         ▼
 * ┌─────────────────────────────────────────────────────────────────┐
 * │              EDGE FUNCTION (Sécurisée)                           │
 * │  ┌─────────────────────────────────────────────────────────────┐│
 * │  │  Actions:                                                   ││
 * │  │  • verify   - Vérification des attributs                    ││
 * │  │  • face-auth - Authentification faciale                     ││
 * │  │  • quota    - Vérification du quota                         ││
 * │  └─────────────────────────────────────────────────────────────┘│
 * └─────────────────────────────────────────────────────────────────┘
 *                                         │
 *                                         ▼ HTTPS
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    API VERIF CI (Externe)                        │
 * │  https://api-rnpp.verif.ci/api/v1                               │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Endpoints API:
 * - POST /authenticate → Token JWT (20 min)
 * - POST /oneci/persons/{NNI}/match → Vérification attributs
 * - POST /oneci/persons/{NNI}/face-auth → Auth faciale
 * - GET /subscription/remaining-requests → Quota
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import edgeLogger from '../_shared/logger.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

// ============ Configuration ============

const ONECI_API_URL = Deno.env.get('ONECI_API_URL') || 'https://api-rnpp.verif.ci';
const ONECI_API_KEY = Deno.env.get('ONECI_API_KEY') || '';
const ONECI_SECRET_KEY = Deno.env.get('ONECI_SECRET_KEY') || '';

// Cache du token (20 minutes)
interface CachedToken {
  token: string;
  expiresAt: number;
}
let cachedToken: CachedToken | null = null;
const TOKEN_CACHE_DURATION = 20 * 60 * 1000; // 20 minutes

// ============ Types ============

interface VerifyRequest {
  action: 'verify' | 'face-auth' | 'quota';
  nni?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  gender?: 'M' | 'F';
  faceImage?: string;
  userId?: string;
}

interface OneciAttributeMatch {
  AttributeName: string;
  ErrorCode: string; // "0" = match, "1" = pas de match
}

interface OneciVerifyResponse {
  success: boolean;
  match: boolean;
  nni: string;
  message: string;
  confidence?: number;
  attributes?: OneciAttributeMatch[];
  attributeResults?: {
    name: string;
    label: string;
    matched: boolean;
    rawErrorCode: string;
  }[];
  error?: string;
}

interface OneciFaceAuthResponse {
  success: boolean;
  authenticated: boolean;
  nni: string;
  message: string;
  confidence?: number;
  matchScore?: number;
  error?: string;
}

interface OneciQuotaResponse {
  remainingRequests: number;
  totalRequests: number;
  planType: string;
  resetDate?: string;
}

const ATTRIBUTE_LABELS: Record<string, string> = {
  FIRST_NAME: 'Prénom',
  LAST_NAME: 'Nom',
  BIRTH_DATE: 'Date de naissance',
  GENDER: 'Sexe',
};

// ============ Fonctions utilitaires ============

/**
 * Obtient un token JWT (avec cache)
 */
async function getAuthToken(): Promise<string> {
  // Vérifier le cache
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  // Demander un nouveau token
  const response = await fetch(`${ONECI_API_URL}/api/v1/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: ONECI_API_KEY,
      secretKey: ONECI_SECRET_KEY,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur d'authentification ONECI: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const token = data.bearerToken || data.access_token;

  if (!token) {
    throw new Error("Token non reçu de l'API ONECI");
  }

  // Mettre en cache
  cachedToken = {
    token,
    expiresAt: Date.now() + TOKEN_CACHE_DURATION,
  };

  return token;
}

/**
 * Vérifie les attributs d'une personne
 */
async function verifyPersonAttributes(
  nni: string,
  firstName: string,
  lastName: string,
  birthDate: string,
  gender: 'M' | 'F'
): Promise<OneciVerifyResponse> {
  const token = await getAuthToken();
  const normalizedNni = nni.replace(/[\s-]/g, '');

  // Créer le formulaire multipart/form-data
  const formData = new FormData();
  formData.append('FIRST_NAME', firstName.trim().toUpperCase());
  formData.append('LAST_NAME', lastName.trim().toUpperCase());
  formData.append('BIRTH_DATE', birthDate);
  formData.append('GENDER', gender);

  const response = await fetch(`${ONECI_API_URL}/api/v1/oneci/persons/${normalizedNni}/match`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const responseText = await response.text();

  if (!response.ok) {
    // Si 401, invalider le token et réessayer
    if (response.status === 401) {
      cachedToken = null;
      return verifyPersonAttributes(nni, firstName, lastName, birthDate, gender);
    }

    return {
      success: false,
      match: false,
      nni: normalizedNni,
      message: `Erreur ONECI (${response.status}): ${responseText}`,
      error: responseText,
    };
  }

  // Parser la réponse
  try {
    edgeLogger.info('[ONECI] Response received', {
      nni: normalizedNni,
      responseLength: responseText?.length || 0,
      hasResponse: !!responseText,
      status: response.status,
    });

    if (!responseText || responseText.trim().length === 0) {
      edgeLogger.info('[ONECI] Empty response - treating as verified person', {
        nni: normalizedNni,
      });
      // Réponse vide = personne vérifiée (pas d'erreur d'attribut)
      return {
        success: true,
        match: true,
        nni: normalizedNni,
        message: 'Identité vérifiée avec succès (réponse vide = aucune erreur)',
        confidence: 100,
      };
    }

    const jsonData = JSON.parse(responseText);
    edgeLogger.info('[ONECI] Parsed JSON data', {
      nni: normalizedNni,
      isArray: Array.isArray(jsonData),
      length: Array.isArray(jsonData) ? jsonData.length : 'N/A',
      data: JSON.stringify(jsonData).substring(0, 200),
    });

    // Format tableau: [{AttributeName, ErrorCode}]
    if (Array.isArray(jsonData)) {
      if (jsonData.length === 0) {
        edgeLogger.info('[ONECI] Empty array - treating as verified person', {
          nni: normalizedNni,
        });
        // Tableau vide = personne vérifiée (pas d'erreur d'attribut)
        return {
          success: true,
          match: true,
          nni: normalizedNni,
          message: 'Identité vérifiée avec succès (tableau vide = aucune erreur)',
          confidence: 100,
        };
      }

      const attributeResults = jsonData.map((item: OneciAttributeMatch) => ({
        name: item.AttributeName,
        label: ATTRIBUTE_LABELS[item.AttributeName] || item.AttributeName,
        matched: item.ErrorCode === '0',
        rawErrorCode: item.ErrorCode,
      }));

      const allMatch = attributeResults.every((attr: { matched: boolean }) => attr.matched);
      const matchedCount = attributeResults.filter(
        (attr: { matched: boolean }) => attr.matched
      ).length;
      const totalCount = attributeResults.length;

      return {
        success: true,
        match: allMatch,
        nni: normalizedNni,
        message: allMatch
          ? 'Toutes les informations correspondent aux registres ONECI'
          : `${matchedCount}/${totalCount} attribut(s) correspondent`,
        attributes: jsonData,
        attributeResults,
        confidence: allMatch ? 100 : Math.round((matchedCount / totalCount) * 100),
      };
    }

    // Autre format de réponse
    return {
      success: true,
      match: jsonData.match !== false,
      nni: normalizedNni,
      message: jsonData.message || 'Vérification effectuée',
      confidence: jsonData.confidence,
    };
  } catch (error) {
    return {
      success: false,
      match: false,
      nni: normalizedNni,
      message: `Erreur de parsing: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      error: responseText,
    };
  }
}

/**
 * Authentification faciale
 */
async function faceAuthentication(nni: string, faceImage: string): Promise<OneciFaceAuthResponse> {
  const token = await getAuthToken();
  const normalizedNni = nni.replace(/[\s-]/g, '');

  const response = await fetch(`${ONECI_API_URL}/api/v1/oneci/persons/${normalizedNni}/face-auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      BIOMETRIC_TYPE: 'AUTH_FACE',
      BIOMETRIC_DATA: faceImage,
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      cachedToken = null;
      return faceAuthentication(nni, faceImage);
    }

    const errorText = await response.text();
    return {
      success: false,
      authenticated: false,
      nni: normalizedNni,
      message: `Erreur ONECI (${response.status}): ${errorText}`,
      error: errorText,
    };
  }

  const data = await response.json();
  return {
    success: true,
    authenticated: data.match === true || data.authenticated === true,
    nni: normalizedNni,
    message: data.message || (data.match ? 'Authentification réussie' : 'Visage non reconnu'),
    confidence: data.confidence,
    matchScore: data.matchScore,
  };
}

/**
 * Récupère le quota restant
 */
async function getRemainingRequests(): Promise<OneciQuotaResponse> {
  const token = await getAuthToken();

  const response = await fetch(`${ONECI_API_URL}/api/v1/subscription/remaining-requests`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      cachedToken = null;
      return getRemainingRequests();
    }

    throw new Error(`Erreur récupération quota: ${response.status}`);
  }

  return await response.json();
}

// ============ Handler principal ============

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Gérer les requêtes OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Vérifier la configuration
    if (!ONECI_API_KEY || !ONECI_SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'Service ONECI non configuré' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as VerifyRequest;
    const { action, nni, firstName, lastName, birthDate, gender, faceImage, userId } = body;

    edgeLogger.info('ONECI verification request', { action, nni, userId });

    let result: OneciVerifyResponse | OneciFaceAuthResponse | OneciQuotaResponse;

    switch (action) {
      case 'verify':
        // Validation
        if (!nni || !firstName || !lastName || !birthDate || !gender) {
          return new Response(JSON.stringify({ error: 'Champs requis manquants' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Validation du NNI (11 chiffres)
        if (!/^\d{11}$/.test(nni.replace(/[\s-]/g, ''))) {
          return new Response(
            JSON.stringify({ error: 'Le NNI doit contenir exactement 11 chiffres' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validation de la date (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
          return new Response(
            JSON.stringify({ error: 'Format de date inval. Utilisez YYYY-MM-DD' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validation du sexe
        if (!['M', 'F'].includes(gender)) {
          return new Response(JSON.stringify({ error: "Le sexe doit être 'M' ou 'F'" }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        result = await verifyPersonAttributes(nni, firstName, lastName, birthDate, gender);

        // Mettre à jour le profil utilisateur si vérifié
        if ((result as OneciVerifyResponse).match && userId) {
          const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
          );

          await supabaseClient
            .from('profiles')
            .update({
              oneci_verified: true,
              oneci_number: nni.replace(/[\s-]/g, ''),
              oneci_verification_date: new Date().toISOString(),
            })
            .eq('id', userId);
        }
        break;

      case 'face-auth':
        if (!nni || !faceImage) {
          return new Response(JSON.stringify({ error: 'NNI et image faciale requis' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        result = await faceAuthentication(nni, faceImage);
        break;

      case 'quota':
        result = await getRemainingRequests();
        break;

      default:
        return new Response(JSON.stringify({ error: 'Action non reconnue' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    edgeLogger.error('ONECI verification error', error instanceof Error ? error : undefined, {
      errorMessage,
    });

    const corsHeaders = getCorsHeaders(req);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
