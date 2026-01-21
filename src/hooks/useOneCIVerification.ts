/**
 * Hook useOneCIVerification
 *
 * Hook React pour la vérification d'identité via ONECI
 * Gère l'état de vérification et les appels au service ONECI
 */

import { useState, useCallback } from 'react';
import { oneCiService, OneCIIdentityVerification, OneCIAuthResponse } from '@/services/verification/index';

export interface OneCIVerificationState {
  isVerifying: boolean;
  isFaceAuth: boolean;
  verificationResult: OneCIIdentityVerification | null;
  faceAuthResult: OneCIAuthResponse | null;
  error: string | null;
  remainingRequests: number | null;
}

export interface OneCIVerificationData {
  firstName: string;
  lastName: string;
  birthDate: string;
  gender?: string;
  // Champs optionnels pour améliorer la correspondance
  birthTown?: string;
  birthCountry?: string;
  nationality?: string;
  residenceAdr1?: string;
  residenceAdr2?: string;
  residenceTown?: string;
}

export const useOneCIVerification = () => {
  const [state, setState] = useState<OneCIVerificationState>({
    isVerifying: false,
    isFaceAuth: false,
    verificationResult: null,
    faceAuthResult: null,
    error: null,
    remainingRequests: null,
  });

  /**
   * Vérifie l'identité avec ONECI
   */
  const verifyIdentity = useCallback(
    async (nni: string, userData: OneCIVerificationData): Promise<OneCIIdentityVerification> => {
      setState((prev) => ({ ...prev, isVerifying: true, error: null }));

      try {
        // Vérifier d'abord le quota
        const remaining = await oneCiService.checkRemainingRequests();

        if (remaining === 0) {
          throw new Error(
            'Limite de requêtes ONECI atteinte. Veuillez réessayer demain ou contacter le support.'
          );
        }

        if (remaining > 0) {
          setState((prev) => ({ ...prev, remainingRequests: remaining }));
        }

        const result = await oneCiService.verifyIdentity(nni, userData);

        setState((prev) => ({
          ...prev,
          verificationResult: result,
          isVerifying: false,
        }));

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Erreur lors de la vérification ONECI. Veuillez réessayer.';
        setState((prev) => ({ ...prev, error: errorMessage, isVerifying: false }));
        throw error;
      }
    },
    []
  );

  /**
   * Authentification faciale avec ONECI
   */
  const faceAuthentication = useCallback(
    async (nni: string, faceImage: string): Promise<OneCIAuthResponse> => {
      setState((prev) => ({ ...prev, isFaceAuth: true, error: null }));

      try {
        const result = await oneCiService.faceAuthentication(nni, faceImage);

        setState((prev) => ({
          ...prev,
          faceAuthResult: result,
          isFaceAuth: false,
        }));

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Erreur lors de l\'authentification faciale. Veuillez réessayer.';
        setState((prev) => ({ ...prev, error: errorMessage, isFaceAuth: false }));
        throw error;
      }
    },
    []
  );

  /**
   * Rafraîchit le nombre de requêtes restantes
   */
  const refreshRemainingRequests = useCallback(async (): Promise<number> => {
    try {
      const remaining = await oneCiService.checkRemainingRequests();
      setState((prev) => ({ ...prev, remainingRequests: remaining }));
      return remaining;
    } catch (error) {
      console.error('Failed to refresh remaining requests:', error);
      return -1;
    }
  }, []);

  /**
   * Réinitialise l'état de vérification
   */
  const reset = useCallback(() => {
    setState({
      isVerifying: false,
      isFaceAuth: false,
      verificationResult: null,
      faceAuthResult: null,
      error: null,
      remainingRequests: null,
    });
  }, []);

  /**
   * Vérifie si le service ONECI est configuré
   */
  const isConfigured = oneCiService.isConfigured();

  return {
    ...state,
    verifyIdentity,
    faceAuthentication,
    refreshRemainingRequests,
    reset,
    isConfigured,
  };
};
