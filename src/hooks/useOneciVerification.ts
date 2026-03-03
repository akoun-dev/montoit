/**
 * Hook React pour la vérification d'identité ONECI
 *
 * Ce hook gère l'état de vérification et les appels au service ONECI.
 * Il supporte deux modes:
 * 1. Vérification par informations (NNI, nom, prénom, date de naissance, sexe)
 * 2. Authentification faciale (optionnel, après vérification des informations)
 *
 * Usage:
 * ```tsx
 * const { verifyPerson, faceAuth, state } = useOneciVerification();
 *
 * // Vérification des informations
 * await verifyPerson({
 *   nni: '12004091753',
 *   firstName: 'ABOA',
 *   lastName: 'AKOUN BERNARD',
 *   birthDate: '2000-12-31',
 *   gender: 'M'
 * });
 *
 * // Authentification faciale (optionnel)
 * await faceAuth('12004091753', base64Image);
 * ```
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  PersonVerificationData,
  OneciPersonMatchResponse,
  OneciFaceAuthResponse,
  AttributeVerificationResult,
} from '@/services/oneci/types';

// ============ Types ============

export interface OneciVerificationState {
  // États de chargement
  isVerifying: boolean;
  isFaceAuthLoading: boolean;
  isCheckingQuota: boolean;

  // Résultats de vérification
  verificationResult: OneciPersonMatchResponse | null;
  faceAuthResult: OneciFaceAuthResponse | null;

  // Quota restant
  remainingRequests: number | null;
  totalRequests: number | null;

  // Gestion des erreurs
  error: string | null;

  // État de la configuration
  isConfigured: boolean;
}

export interface UseOneciVerificationReturn {
  // État
  state: OneciVerificationState;

  // Actions
  verifyPerson: (data: PersonVerificationData) => Promise<OneciPersonMatchResponse | null>;
  faceAuth: (nni: string, faceImage: string) => Promise<OneciFaceAuthResponse | null>;
  checkQuota: () => Promise<void>;
  reset: () => void;
  clearError: () => void;

  // Helpers
  isVerified: boolean;
  isFaceVerified: boolean;
  attributeResults: AttributeVerificationResult[];
}

// ============ État initial ============

const initialState: OneciVerificationState = {
  isVerifying: false,
  isFaceAuthLoading: false,
  isCheckingQuota: false,
  verificationResult: null,
  faceAuthResult: null,
  remainingRequests: null,
  totalRequests: null,
  error: null,
  isConfigured: false,
};

// ============ Hook ============

export function useOneciVerification(): UseOneciVerificationReturn {
  const [state, setState] = useState<OneciVerificationState>(initialState);

  // Vérifier la configuration au montage
  useEffect(() => {
    const configured = !!(
      import.meta.env['VITE_ONECI_API_KEY'] && import.meta.env['VITE_ONECI_SECRET_KEY']
    );
    setState((prev) => ({ ...prev, isConfigured: configured }));
  }, []);

  /**
   * Vérifie les informations d'une personne via ONECI
   *
   * @param data - Les données de la personne à vérifier
   * @returns Le résultat de la vérification ou null en cas d'erreur
   */
  const verifyPerson = useCallback(
    async (data: PersonVerificationData): Promise<OneciPersonMatchResponse | null> => {
      // Validation côté client
      if (!data.nni || !/^\d{11}$/.test(data.nni.replace(/[\s-]/g, ''))) {
        setState((prev) => ({
          ...prev,
          error: 'Le NNI doit contenir exactement 11 chiffres',
        }));
        return null;
      }

      if (!data.firstName?.trim() || !data.lastName?.trim()) {
        setState((prev) => ({
          ...prev,
          error: 'Le prénom et le nom sont obligatoires',
        }));
        return null;
      }

      if (!data.birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(data.birthDate)) {
        setState((prev) => ({
          ...prev,
          error: 'Format de date inval. Utilisez YYYY-MM-DD',
        }));
        return null;
      }

      if (!['M', 'F'].includes(data.gender)) {
        setState((prev) => ({
          ...prev,
          error: "Le sexe doit être 'M' ou 'F'",
        }));
        return null;
      }

      setState((prev) => ({
        ...prev,
        isVerifying: true,
        error: null,
        verificationResult: null,
      }));

      try {
        // Appel via Supabase Edge Function pour sécuriser les credentials
        const { data: result, error } = await supabase.functions.invoke('oneci-verify', {
          body: {
            action: 'verify',
            nni: data.nni.replace(/[\s-]/g, ''),
            firstName: data.firstName.trim().toUpperCase(),
            lastName: data.lastName.trim().toUpperCase(),
            birthDate: data.birthDate,
            gender: data.gender,
          },
        });

        if (error) {
          throw new Error(error.message || 'Erreur lors de la vérification ONECI');
        }

        const verificationResult = result as OneciPersonMatchResponse;

        setState((prev) => ({
          ...prev,
          isVerifying: false,
          verificationResult,
        }));

        return verificationResult;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Erreur lors de la vérification ONECI';
        console.error('[useOneciVerification] Erreur:', error);
        setState((prev) => ({
          ...prev,
          isVerifying: false,
          error: errorMessage,
        }));
        return null;
      }
    },
    []
  );

  /**
   * Authentifie une personne via reconnaissance faciale
   *
   * @param nni - Le numéro national d'identification
   * @param faceImage - L'image faciale en base64 (sans préfixe data:image)
   * @returns Le résultat de l'authentification ou null en cas d'erreur
   */
  const faceAuth = useCallback(
    async (nni: string, faceImage: string): Promise<OneciFaceAuthResponse | null> => {
      if (!nni || !/^\d{11}$/.test(nni.replace(/[\s-]/g, ''))) {
        setState((prev) => ({
          ...prev,
          error: 'Le NNI doit contenir exactement 11 chiffres',
        }));
        return null;
      }

      if (!faceImage) {
        setState((prev) => ({
          ...prev,
          error: 'Une image faciale est requise',
        }));
        return null;
      }

      setState((prev) => ({
        ...prev,
        isFaceAuthLoading: true,
        error: null,
      }));

      try {
        // Appel via Supabase Edge Function
        const { data: result, error } = await supabase.functions.invoke('oneci-verify', {
          body: {
            action: 'face-auth',
            nni: nni.replace(/[\s-]/g, ''),
            faceImage,
          },
        });

        if (error) {
          throw new Error(error.message || "Erreur lors de l'authentification faciale");
        }

        const faceAuthResult = result as OneciFaceAuthResponse;

        setState((prev) => ({
          ...prev,
          isFaceAuthLoading: false,
          faceAuthResult,
        }));

        return faceAuthResult;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Erreur lors de l'authentification faciale";
        console.error('[useOneciVerification] Erreur face auth:', error);
        setState((prev) => ({
          ...prev,
          isFaceAuthLoading: false,
          error: errorMessage,
        }));
        return null;
      }
    },
    []
  );

  /**
   * Vérifie le quota de requêtes restantes
   */
  const checkQuota = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, isCheckingQuota: true }));

    try {
      const { data, error } = await supabase.functions.invoke('oneci-verify', {
        body: { action: 'quota' },
      });

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        isCheckingQuota: false,
        remainingRequests: data.remainingRequests,
        totalRequests: data.totalRequests,
      }));
    } catch (error) {
      console.error('[useOneciVerification] Erreur quota:', error);
      setState((prev) => ({
        ...prev,
        isCheckingQuota: false,
      }));
    }
  }, []);

  /**
   * Réinitialise l'état du hook
   */
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  /**
   * Efface l'erreur
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Valeurs dérivées
  const isVerified = state.verificationResult?.match ?? false;
  const isFaceVerified = state.faceAuthResult?.authenticated ?? false;
  const attributeResults = state.verificationResult?.attributeResults ?? [];

  return {
    state,
    verifyPerson,
    faceAuth,
    checkQuota,
    reset,
    clearError,
    isVerified,
    isFaceVerified,
    attributeResults,
  };
}

export default useOneciVerification;
