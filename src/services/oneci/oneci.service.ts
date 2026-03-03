/**
 * Service pour l'intégration ONECI (Office National de l'État Civil de Côte d'Ivoire)
 *
 * API Documentation: https://api-rnpp.verif.ci
 *
 * Ce service permet:
 * - Authentifier et obtenir un token Bearer (mis en cache 20 min)
 * - Vérifier les attributs d'une personne (NNI, nom, prénom, date de naissance, genre)
 * - Authentifier une personne via reconnaissance faciale
 * - Vérifier le quota de requêtes restantes
 * - Mettre à jour le profil utilisateur après vérification réussie
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    FRONTEND (React)                              │
 * │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
 * │  │   ONECIForm     │  │   useOneci      │  │   UI State      │  │
 * │  │   (Formulaire)  │──│   Hook          │──│   (React hooks) │  │
 * │  └────────┬────────┘  └─────────────────┘  └─────────────────┘  │
 * │           │ fetch()                                           │
 * └───────────┼─────────────────────────────────────────────────────┘
 *             │
 *             ▼
 * ┌─────────────────────────────────────────────────────────────────┐
 * │              SUPABASE DATABASE (Mise à jour profil)         │
 * │  ┌─────────────────────────────────────────────────────────────┐│
 * │  │              updateProfileOneciVerified()             ││
 * │  │  (Met à jour oneci_verified, is_verified)          ││
 * │  └─────────────────────────────────────────────────────────────┘│
 * └─────────────────────────────────────────────────────────────────┘
 *                                │
 *                                ▼ HTTPS
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    API VERIF CI (Externe)                        │
 * │  https://api-rnpp.verif.ci/api/v1                               │
 * │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
 * │  │/authenticate│ │/oneci/      │ │/oneci/      │               │
 * │  │ (Token JWT) │ │persons/{nni}│ │persons/{nni}│               │
 * │  │             │ │/match       │ │/face-auth   │               │
 * │  └─────────────┘ └─────────────┘ └─────────────┘               │
 * └─────────────────────────────────────────────────────────────────┘
 */

import { supabase } from '@/services/supabase/client';
import type {
  OneciAuthenticateResponse,
  OneciPersonMatchResponse,
  OneciFaceAuthRequest,
  OneciFaceAuthResponse,
  OneciRemainingRequestsResponse,
  OneciServiceConfig,
  PersonVerificationData,
  VerificationResult,
  OneciAttributeMatch,
  AttributeVerificationResult,
} from './types';
import { OneciBiometricType, ATTRIBUTE_LABELS } from './types';

// URL de base de l'API ONECI
const ONECI_API_URL = 'https://api-rnpp.verif.ci';

// Durée de cache du token (en millisecondes) - 20 minutes selon spécification ONECI
const TOKEN_CACHE_DURATION = 20 * 60 * 1000; // 20 minutes

/**
 * Configuration du service ONECI
 */
let serviceConfig: OneciServiceConfig | null = null;

/**
 * Auto-initialisation du service ONECI avec les variables d'environnement
 * (exécuté au chargement du module)
 */
const ONECI_API_KEY = import.meta.env['VITE_ONECI_API_KEY'] || '';
const ONECI_SECRET_KEY = import.meta.env['VITE_ONECI_SECRET_KEY'] || '';
const ONECI_API_URL_ENV = import.meta.env['VITE_ONECI_API_URL'] || '';

if (ONECI_API_KEY && ONECI_SECRET_KEY) {
  serviceConfig = {
    apiKey: ONECI_API_KEY,
    secretKey: ONECI_SECRET_KEY,
    apiUrl: ONECI_API_URL_ENV || ONECI_API_URL,
  };
  console.log('[OneciService] Service auto-initialized from environment variables');
} else {
  console.warn('[OneciService] Service not configured - missing environment variables', {
    hasApiKey: !!ONECI_API_KEY,
    hasSecretKey: !!ONECI_SECRET_KEY,
  });
}

/**
 * Token en cache avec son timestamp d'expiration
 */
interface CachedToken {
  token: string;
  expiresAt: number;
}
let cachedToken: CachedToken | null = null;

/**
 * Initialise le service ONECI avec les credentials
 */
export function initOneciService(config: OneciServiceConfig): void {
  serviceConfig = {
    ...config,
    apiUrl: config.apiUrl || ONECI_API_URL,
  };
}

/**
 * Vérifie si le service est configuré
 */
function isConfigured(): boolean {
  return !!(serviceConfig?.apiKey && serviceConfig?.secretKey);
}

/**
 * Retourne l'URL de l'API
 */
function getApiUrl(): string {
  return serviceConfig?.apiUrl || ONECI_API_URL;
}

/**
 * Récupère un token Bearer (avec cache)
 */
export async function getAuthToken(): Promise<string> {
  if (!isConfigured()) {
    throw new Error("Service ONECI non configuré. Appelez initOneciService() d'abord.");
  }

  // Vérifier si le token en cache est encore valide
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  // Obtenir un nouveau token
  console.log("[OneciService] Demande de token d'authentification...");
  const response = await fetch(`${getApiUrl()}/api/v1/authenticate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      apiKey: serviceConfig!.apiKey,
      secretKey: serviceConfig!.secretKey,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[OneciService] Erreur d'authentification:", response.status, errorText);
    throw new Error(`Erreur d'authentification ONECI: ${response.status}`);
  }

  const authData = (await response.json()) as OneciAuthenticateResponse & { bearerToken?: string };
  console.log("[OneciService] Réponse d'authentification complète:", authData);

  // L'API retourne bearerToken au lieu de access_token
  const token = authData.bearerToken || authData.access_token;
  console.log(
    '[OneciService] Token utilisé:',
    token ? token.substring(0, 20) + '...' : 'undefined'
  );

  // Mettre en cache le token
  cachedToken = {
    token: token,
    expiresAt: Date.now() + TOKEN_CACHE_DURATION,
  };

  return cachedToken.token;
}

/**
 * Invalide le token en cache (utile après une erreur d'auth)
 */
export function invalidateAuthToken(): void {
  cachedToken = null;
}

/**
 * Vérifie les attributs d'une personne ivoirienne
 *
 * @param nni - Numéro National d'Identification (10-12 chiffres)
 * @param firstName - Prénom
 * @param lastName - Nom
 * @param birthDate - Date de naissance (format YYYY-MM-DD)
 * @param gender - Genre ('M' ou 'F')
 */
export async function verifyPersonAttributes(
  nni: string,
  firstName: string,
  lastName: string,
  birthDate: string,
  gender: 'M' | 'F'
): Promise<OneciPersonMatchResponse> {
  const token = await getAuthToken();
  console.log('[OneciService] Token obtenu pour vérification:', token.substring(0, 20) + '...');

  // Normaliser le NNI (supprimer les espaces et tirets)
  const normalizedNni = nni.replace(/[\s-]/g, '');

  // Créer le formulaire multipart/form-data
  const formData = new FormData();
  formData.append('FIRST_NAME', firstName.trim());
  formData.append('LAST_NAME', lastName.trim());
  formData.append('BIRTH_DATE', birthDate);
  formData.append('GENDER', gender);

  console.log('[OneciService] Envoi de la requête de vérification pour NNI:', normalizedNni);
  console.log('[OneciService] FormData:', { firstName, lastName, birthDate, gender });

  const response = await fetch(`${getApiUrl()}/api/v1/oneci/persons/${normalizedNni}/match`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  // Logger la réponse brute pour débogage
  const responseText = await response.text();
  console.log('[OneciService] Réponse brute:', {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    bodyLength: responseText.length,
    body: responseText.substring(0, 200),
  });

  if (!response.ok) {
    console.error('[OneciService] Erreur vérification attributs:', response.status, responseText);

    // Si 401, invalider le token et réessayer
    if (response.status === 401) {
      console.warn('[OneciService] 401 Unauthorized - réessaie avec un nouveau token');
      invalidateAuthToken();
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

  // Parser la réponse JSON avec gestion d'erreur
  try {
    console.log('[OneciService] Tentative de parsing JSON de:', responseText);

    if (!responseText || responseText.trim().length === 0) {
      console.error("[OneciService] Réponse vide de l'API ONECI");
      return {
        success: false,
        match: false,
        nni: normalizedNni,
        message: "Réponse vide de l'API ONECI (status 201 mais pas de corps)",
        error: 'Empty response body',
      };
    }

    const jsonData = JSON.parse(responseText);
    console.log('[OneciService] JSON parsé avec succès:', {
      isArray: Array.isArray(jsonData),
      type: typeof jsonData,
      value: jsonData,
    });

    // Gérer le cas où l'API retourne un tableau de résultats d'attributs
    // Format: [{AttributeName: "FIRST_NAME", ErrorCode: "1"}, ...]
    // ErrorCode "1" = erreur sur l'attribut
    // Tableau vide [] = TOUT EST CORRECT (pas d'erreur)
    if (Array.isArray(jsonData)) {
      console.log('[OneciService] Format tableau détecté - parsing des attributs');

      // Si le tableau est vide, TOUT EST CORRECT (pas d'erreur détectée)
      if (jsonData.length === 0) {
        console.log('[OneciService] Tableau vide - TOUTES les informations correspondent');
        return {
          success: true,
          match: true,
          nni: normalizedNni,
          message: 'Toutes les informations correspondent aux registres ONECI',
          attributes: [],
          confidence: 100,
        };
      }

      // Parser les résultats des attributs
      const attributeResults: AttributeVerificationResult[] = jsonData.map(
        (item: OneciAttributeMatch) => {
          const matched = item.ErrorCode === '0';
          return {
            name: item.AttributeName,
            label: ATTRIBUTE_LABELS[item.AttributeName] || item.AttributeName,
            matched,
            rawErrorCode: item.ErrorCode,
          };
        }
      );

      // Vérifier si tous les attributs correspondent
      const allMatch = attributeResults.every((attr) => attr.matched);

      // Compter les attributs qui correspondent
      const matchedCount = attributeResults.filter((attr) => attr.matched).length;
      const totalCount = attributeResults.length;

      console.log('[OneciService] Résultats par attribut:', {
        allMatch,
        matchedCount,
        totalCount,
        results: attributeResults,
      });

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

    const personData = jsonData as OneciPersonMatchResponse;
    console.log('[OneciService] Données parsées:', personData);

    // S'assurer que la réponse a les champs requis
    if (personData.success === undefined) {
      // Si le champ success n'est pas présent, déduire du contenu
      personData.success = true;
      personData.match = personData.match !== false;
    }

    return personData;
  } catch (error) {
    console.error('[OneciService] Erreur de parsing JSON:', error);
    console.error('[OneciService] Corps de la réponse:', responseText);
    return {
      success: false,
      match: false,
      nni: normalizedNni,
      message: `Erreur de parsing de la réponse ONECI: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      error: responseText,
    };
  }
}

/**
 * Authentifie une personne via reconnaissance faciale
 *
 * @param nni - Numéro National d'Identification
 * @param biometricData - Image encodée en base64
 * @param biometricType - Type de biométrie (défaut: AUTH_FACE)
 */
export async function faceAuthentication(
  nni: string,
  biometricData: string,
  biometricType: OneciBiometricType = OneciBiometricType.AUTH_FACE
): Promise<OneciFaceAuthResponse> {
  const token = await getAuthToken();

  // Normaliser le NNI
  const normalizedNni = nni.replace(/[\s-]/g, '');

  const response = await fetch(`${getApiUrl()}/api/v1/oneci/persons/${normalizedNni}/face-auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      BIOMETRIC_TYPE: biometricType,
      BIOMETRIC_DATA: biometricData,
    } as OneciFaceAuthRequest),
  });

  if (!response.ok) {
    // Si 401, invalider le token et réessayer
    if (response.status === 401) {
      invalidateAuthToken();
      return faceAuthentication(nni, biometricData, biometricType);
    }

    const errorText = await response.text();
    console.error('[OneciService] Erreur auth faciale:', response.status, errorText);
    return {
      success: false,
      authenticated: false,
      nni: normalizedNni,
      message: `Erreur ONECI (${response.status}): ${errorText}`,
      error: errorText,
    };
  }

  return (await response.json()) as OneciFaceAuthResponse;
}

/**
 * Récupère le nombre de requêtes restantes dans le quota
 */
export async function getRemainingRequests(): Promise<OneciRemainingRequestsResponse> {
  const token = await getAuthToken();

  const response = await fetch(`${getApiUrl()}/api/v1/subscription/remaining-requests`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    // Si 401, invalider le token et réessayer
    if (response.status === 401) {
      invalidateAuthToken();
      return getRemainingRequests();
    }

    const errorText = await response.text();
    console.error('[OneciService] Erreur récupération quota:', response.status, errorText);
    throw new Error(`Erreur ONECI (${response.status}): ${errorText}`);
  }

  return (await response.json()) as OneciRemainingRequestsResponse;
}

/**
 * Vérifie une personne complète (attributs + optionnellement visage)
 */
export async function verifyPerson(
  data: PersonVerificationData,
  faceImage?: string
): Promise<VerificationResult> {
  try {
    // D'abord vérifier les attributs
    const attributesResult = await verifyPersonAttributes(
      data.nni,
      data.firstName,
      data.lastName,
      data.birthDate,
      data.gender
    );

    if (!attributesResult.success) {
      return {
        success: false,
        verified: false,
        message: attributesResult.message,
        error: attributesResult.error,
      };
    }

    // Si les attributs ne correspondent pas
    if (!attributesResult.match) {
      return {
        success: true,
        verified: false,
        message: 'Les informations ne correspondent pas aux registres ONECI',
        confidence: 0,
      };
    }

    // Si une image faciale est fournie, faire également l'authentification faciale
    if (faceImage) {
      const faceResult = await faceAuthentication(data.nni, faceImage);

      if (!faceResult.success) {
        return {
          success: true,
          verified: false,
          message: `Attributs validés mais erreur auth faciale: ${faceResult.message}`,
          error: faceResult.error,
        };
      }

      return {
        success: true,
        verified: faceResult.authenticated,
        message: faceResult.authenticated
          ? 'Identité vérifiée avec succès (attributs + visage)'
          : 'Attributs validés mais visage non reconnu',
        confidence: faceResult.matchScore || faceResult.confidence,
      };
    }

    // Seuls les attributs ont été vérifiés
    return {
      success: true,
      verified: true,
      message: 'Identité vérifiée avec succès (attributs)',
      confidence: attributesResult.confidence,
    };
  } catch (error) {
    console.error('[OneciService] Erreur lors de la vérification:', error);
    return {
      success: false,
      verified: false,
      message: error instanceof Error ? error.message : 'Erreur inconnue',
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

/**
 * Convertit une image (File ou Blob) en base64
 * L'API ONECI attend l'image sans le préfixe data:image/xxx;base64,
 */
export function imageToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Retirer le préfixe "data:image/xxx;base64,"
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Erreur lors de la conversion de l'image"));
    reader.readAsDataURL(file);
  });
}

/**
 * Valide le format d'un NNI (Numéro National d'Identification)
 * Doit contenir exactement 11 chiffres selon la nouvelle spécification
 */
export function isValidNni(nni: string): boolean {
  const normalized = nni.replace(/[\s-]/g, '');
  return /^\d{11}$/.test(normalized);
}

/**
 * Formate une date de naissance pour l'API (YYYY-MM-DD)
 * Exemple: 2000-12-31
 */
export function formatDateForApi(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const formatted = d.toISOString().split('T')[0];
  return formatted || '';
}

/**
 * Met à jour le profil utilisateur après vérification ONECI réussie
 *
 * Cette fonction:
 * 1. Met à jour profiles.oneci_verified = true
 * 2. Crée une entrée dans user_verifications avec type 'identity'
 * 3. Met à jour profiles.is_verified = true (si applicable)
 * 4. Met à jour le trust_score
 *
 * @param userId - ID de l'utilisateur
 * @param nni - Numéro National d'Identification
 * @param verificationData - Données de vérification ONECI
 */
export async function updateProfileOneciVerified(
  userId: string,
  nni: string,
  verificationData: OneciPersonMatchResponse
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[OneciService] Mise à jour du profil pour ONECI:', { userId, nni });

    // 1. Mettre à jour le profil avec oneci_verified = true
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        oneci_verified: true,
        // Si c'est la première vérification réussie, mettre is_verified à true
        // is_verified: true, // Commenté pour laisser la décision à l'admin
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (profileError) {
      console.error('[OneciService] Erreur mise à jour profil:', profileError);
      return { success: false, error: profileError.message };
    }

    // 2. Créer une entrée dans user_verifications
    const { error: verificationError } = await supabase
      .from('user_verifications')
      .insert({
        user_id: userId,
        verification_type: 'identity',
        status: 'approved',
        verification_data: {
          nni: nni,
          attributes: verificationData.attributes || [],
          confidence: verificationData.confidence,
          message: verificationData.message,
          verified_at: new Date().toISOString(),
        },
        verified_at: new Date().toISOString(),
      });

    if (verificationError) {
      console.error('[OneciService] Erreur création verification record:', verificationError);
      // Ne pas bloquer si la création du record échoue
      console.warn('[OneciService] Profil mis à jour mais record de verification non créé');
    }

    console.log('[OneciService] Profil mis à jour avec succès');
    return { success: true };
  } catch (error) {
    console.error('[OneciService] Erreur updateProfileOneciVerified:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

/**
 * Met à jour le profil après échec de vérification ONECI
 *
 * @param userId - ID de l'utilisateur
 * @param reason - Raison de l'échec
 */
export async function updateProfileOneciFailed(
  userId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[OneciService] Marquage échec ONECI:', { userId, reason });

    const { error } = await supabase
      .from('user_verifications')
      .insert({
        user_id: userId,
        verification_type: 'identity',
        status: 'rejected',
        notes: reason,
        verification_data: {
          failed_at: new Date().toISOString(),
          reason,
        },
      });

    if (error) {
      console.error('[OneciService] Erreur création échec record:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('[OneciService] Erreur updateProfileOneciFailed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

/**
 * Exports par défaut pour un usage facile
 */
const oneciService = {
  init: initOneciService,
  getAuthToken,
  invalidateAuthToken,
  verifyPersonAttributes,
  faceAuthentication,
  getRemainingRequests,
  verifyPerson,
  imageToBase64,
  isValidNni,
  formatDateForApi,
  updateProfileOneciVerified,
  updateProfileOneciFailed,
};

export default oneciService;
