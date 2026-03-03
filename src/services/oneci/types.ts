/**
 * Types pour l'intégration ONECI (Office National de l'État Civil de Côte d'Ivoire)
 * API: https://api-rnpp.verif.ci
 *
 * Flux de vérification:
 * 1. POST /authenticate → Obtient un token JWT (valide 20 min)
 * 2. POST /oneci/persons/{NNI}/match → Vérifie les attributs
 * 3. POST /oneci/persons/{NNI}/face-auth → Authentification faciale
 */

// ========== Types d'Authentification ==========

export interface OneciAuthenticateRequest {
  apiKey: string;
  secretKey: string;
}

export interface OneciAuthenticateResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  // L'API retourne aussi bearerToken dans certains cas
  bearerToken?: string;
}

// ========== Types de Vérification d'Attributs ==========

export interface OneciPersonMatchRequest {
  NNI: string;
  FIRST_NAME: string;
  LAST_NAME: string;
  BIRTH_DATE: string; // Format: YYYY-MM-DD (ex: 2000-12-31)
  GENDER: 'M' | 'F';
}

/**
 * Résultat de correspondance pour un attribut individuel
 * Format retourné par l'API VERIF CI
 */
export interface OneciAttributeMatch {
  AttributeName: string; // ex: "FIRST_NAME", "LAST_NAME", "BIRTH_DATE", "GENDER"
  ErrorCode: string; // "0" = match (correspondance), "1" = pas de match
}

/**
 * Résultat de vérification d'un attribut (format simplifié pour le frontend)
 */
export interface AttributeVerificationResult {
  name: string; // Nom de l'attribut (FIRST_NAME, LAST_NAME, etc.)
  label: string; // Label en français pour l'affichage
  matched: boolean; // true si correspondance, false sinon
  rawErrorCode: string; // Code d'erreur original ("0" ou "1")
}

/**
 * Mapping des noms d'attributs vers les labels français
 */
export const ATTRIBUTE_LABELS: Record<string, string> = {
  FIRST_NAME: 'Prénom',
  LAST_NAME: 'Nom',
  BIRTH_DATE: 'Date de naissance',
  GENDER: 'Sexe',
};

export interface OneciPersonMatchResponse {
  success: boolean;
  match: boolean; // true si TOUS les attributs correspondent
  nni: string;
  message: string;
  confidence?: number;
  attributes?: OneciAttributeMatch[]; // Tableau des résultats par attribut (format API)
  attributeResults?: AttributeVerificationResult[]; // Résultats formatés pour le frontend
  person?: {
    nni: string;
    firstName: string;
    lastName: string;
    birthDate: string;
    gender: 'M' | 'F';
    birthPlace?: string;
    motherName?: string;
    fatherName?: string;
  };
  error?: string;
}

// ========== Types d'Authentification Faciale ==========

export enum OneciBiometricType {
  AUTH_FACE = 'AUTH_FACE',
  FACE_VERIFICATION = 'FACE_VERIFICATION',
}

export interface OneciFaceAuthRequest {
  NNI: string;
  BIOMETRIC_TYPE: OneciBiometricType;
  BIOMETRIC_DATA: string; // Base64 encoded image
}

export interface OneciFaceAuthResponse {
  success: boolean;
  authenticated: boolean;
  nni: string;
  message: string;
  confidence?: number;
  matchScore?: number;
  error?: string;
}

// ========== Types de Quota ==========

export interface OneciRemainingRequestsResponse {
  remainingRequests: number;
  totalRequests: number;
  planType: string;
  resetDate?: string;
}

// ========== Types d'Erreur ==========

export class OneciError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'OneciError';
  }
}

// ========== Types Utilitaires ==========

/**
 * Résultat de mise à jour du profil après vérification
 */
export interface ProfileUpdateResult {
  success: boolean;
  error?: string;
}

export interface OneciServiceConfig {
  apiKey: string;
  secretKey: string;
  apiUrl?: string;
}

export type OneciGender = 'M' | 'F';

export interface PersonVerificationData {
  nni: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: OneciGender;
}

export interface VerificationResult {
  success: boolean;
  verified: boolean;
  message: string;
  confidence?: number;
  error?: string;
}
