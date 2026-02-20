/**
 * Types pour l'intégration ONECI (Office National de l'État Civil de Côte d'Ivoire)
 * API: https://api-rnpp.verif.ci
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
}

// ========== Types de Vérification d'Attributs ==========

export interface OneciPersonMatchRequest {
  NNI: string;
  FIRST_NAME: string;
  LAST_NAME: string;
  BIRTH_DATE: string; // Format: YYYY-MM-DD
  GENDER: 'M' | 'F';
}

export interface OneciPersonMatchResponse {
  success: boolean;
  match: boolean;
  nni: string;
  message: string;
  confidence?: number;
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
