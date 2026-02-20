/**
 * Service pour l'intégration ONECI (Office National de l'État Civil de Côte d'Ivoire)
 *
 * API Documentation: https://api-rnpp.verif.ci
 *
 * Ce service permet:
 * - Authentifier et obtenir un token Bearer
 * - Vérifier les attributs d'une personne (NNI, nom, prénom, date de naissance, genre)
 * - Authentifier une personne via reconnaissance faciale
 * - Vérifier le quota de requêtes restantes
 */

import type {
  OneciAuthenticateResponse,
  OneciPersonMatchResponse,
  OneciFaceAuthRequest,
  OneciFaceAuthResponse,
  OneciRemainingRequestsResponse,
  OneciServiceConfig,
  OneciBiometricType,
  PersonVerificationData,
  VerificationResult,
} from './types';

// URL de base de l'API ONECI
const ONECI_API_URL = 'https://api-rnpp.verif.ci';

// Durée de cache du token (en millisecondes) - par défaut 1 heure
const TOKEN_CACHE_DURATION = 55 * 60 * 1000; // 55 minutes pour éviter l'expiration

/**
 * Configuration du service ONECI
 */
let serviceConfig: OneciServiceConfig | null = null;

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
    throw new Error('Service ONECI non configuré. Appelez initOneciService() d\'abord.');
  }

  // Vérifier si le token en cache est encore valide
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  // Obtenir un nouveau token
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
    console.error('[OneciService] Erreur d\'authentification:', response.status, errorText);
    throw new Error(`Erreur d'authentification ONECI: ${response.status}`);
  }

  const data = (await response.json()) as OneciAuthenticateResponse;

  // Mettre en cache le token
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || TOKEN_CACHE_DURATION / 1000) * 1000,
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

  // Normaliser le NNI (supprimer les espaces et tirets)
  const normalizedNni = nni.replace(/[\s-]/g, '');

  // Créer le formulaire multipart/form-data
  const formData = new FormData();
  formData.append('FIRST_NAME', firstName.trim());
  formData.append('LAST_NAME', lastName.trim());
  formData.append('BIRTH_DATE', birthDate);
  formData.append('GENDER', gender);

  const response = await fetch(
    `${getApiUrl()}/api/v1/oneci/persons/${normalizedNni}/match`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    // Si 401, invalider le token et réessayer
    if (response.status === 401) {
      invalidateAuthToken();
      return verifyPersonAttributes(nni, firstName, lastName, birthDate, gender);
    }

    const errorText = await response.text();
    console.error('[OneciService] Erreur vérification attributs:', response.status, errorText);
    return {
      success: false,
      match: false,
      nni: normalizedNni,
      message: `Erreur ONECI (${response.status}): ${errorText}`,
      error: errorText,
    };
  }

  return (await response.json()) as OneciPersonMatchResponse;
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

  const response = await fetch(`${getApiUrl()}/api/v1/oneci/face-auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      NNI: normalizedNni,
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
 */
export function imageToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Retirer le préfixe "data:image/xxx;base64,"
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Erreur lors de la conversion de l\'image'));
    reader.readAsDataURL(file);
  });
}

/**
 * Valide le format d'un NNI (Numéro National d'Identification)
 * Doit contenir entre 10 et 12 chiffres
 */
export function isValidNni(nni: string): boolean {
  const normalized = nni.replace(/[\s-]/g, '');
  return /^\d{10,12}$/.test(normalized);
}

/**
 * Formate une date de naissance pour l'API (YYYY-MM-DD)
 */
export function formatDateForApi(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
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
};

export default oneciService;
