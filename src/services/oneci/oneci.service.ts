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
  OneciPersonMatchResponse,
  OneciFaceAuthResponse,
  OneciRemainingRequestsResponse,
  OneciServiceConfig,
  PersonVerificationData,
  VerificationResult,
} from './types';
import { OneciBiometricType } from './types';

// URL de base de l'API ONECI
const ONECI_API_URL = 'https://api-rnpp.verif.ci';
const ONECI_EDGE_FUNCTION = 'oneci-verify';

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
  return !!(
    (serviceConfig?.apiKey && serviceConfig?.secretKey) ||
    import.meta.env['VITE_SUPABASE_URL'] ||
    import.meta.env['SUPABASE_URL']
  );
}

async function invokeOneciFunction<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(ONECI_EDGE_FUNCTION, { body });

  if (error) {
    throw new Error(error.message || 'Erreur lors de la communication avec le service ONECI');
  }

  if (!data) {
    throw new Error('Aucune reponse recue du service ONECI');
  }

  return data as T;
}

/**
 * Récupère un token Bearer (avec cache)
 */
export async function getAuthToken(): Promise<string> {
  if (!isConfigured()) {
    throw new Error("Service ONECI non configuré. Appelez initOneciService() d'abord.");
  }

  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  // Le token est gere cote edge function pour eviter les appels directs au navigateur.
  cachedToken = {
    token: 'managed-by-edge-function',
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
  // Normaliser le NNI (supprimer les espaces et tirets)
  const normalizedNni = nni.replace(/[\s-]/g, '');
  try {
    return await invokeOneciFunction<OneciPersonMatchResponse>({
      action: 'verify',
      nni: normalizedNni,
      firstName: firstName.trim().toUpperCase(),
      lastName: lastName.trim().toUpperCase(),
      birthDate,
      gender,
    });
  } catch (error) {
    console.error('[OneciService] Erreur verification attributs:', error);
    return {
      success: false,
      match: false,
      nni: normalizedNni,
      message:
        error instanceof Error ? error.message : 'Erreur inconnue lors de la verification ONECI',
      error: error instanceof Error ? error.message : 'Unknown error',
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
  // Normaliser le NNI
  const normalizedNni = nni.replace(/[\s-]/g, '');
  const normalizedImage = biometricData.includes(',')
    ? biometricData.split(',')[1] || biometricData
    : biometricData;

  try {
    return await invokeOneciFunction<OneciFaceAuthResponse>({
      action: 'face-auth',
      nni: normalizedNni,
      faceImage: normalizedImage,
      biometricType,
    });
  } catch (error) {
    console.error('[OneciService] Erreur auth faciale:', error);
    return {
      success: false,
      authenticated: false,
      nni: normalizedNni,
      message:
        error instanceof Error
          ? error.message
          : "Erreur inconnue lors de l'authentification faciale ONECI",
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Récupère le nombre de requêtes restantes dans le quota
 */
export async function getRemainingRequests(): Promise<OneciRemainingRequestsResponse> {
  return invokeOneciFunction<OneciRemainingRequestsResponse>({
    action: 'quota',
  });
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
