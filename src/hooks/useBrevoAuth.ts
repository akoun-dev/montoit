/**
 * Hook React pour l'authentification Brevo
 *
 * Simplifie l'utilisation du service d'authentification OTP de Brevo
 * dans les composants React
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabase/client';
import { authBrevoService } from '@/services/brevo/auth-brevo.service';

export interface UseBrevoAuthState {
  loading: boolean;
  error: string | null;
  success: string | null;
  otpSent: boolean;
  needsName: boolean;
  isNewUser: boolean;
}

export interface UseBrevoAuthActions {
  // Actions principales
  sendOTP: (data: {
    recipient: string;
    method: 'email' | 'phone';
    fullName?: string;
  }) => Promise<boolean>;

  verifyOTP: (code: string) => Promise<boolean>;

  submitName: (fullName: string) => Promise<boolean>;

  selectRole: (role: 'locataire' | 'proprietaire' | 'agence') => Promise<void>;

  clearError: () => void;

  clearSuccess: () => void;

  reset: () => void;
}

export function useBrevoAuth() {
  const navigate = useNavigate();

  const [state, setState] = useState<UseBrevoAuthState>({
    loading: false,
    error: null,
    success: null,
    otpSent: false,
    needsName: false,
    isNewUser: false,
  });

  // State pour les données temporaires
  const [tempData, setTempData] = useState<{
    recipient: string;
    method: 'email' | 'phone';
  } | null>(null);

  const setStateField = useCallback(
    <K extends keyof UseBrevoAuthState>(field: K, value: UseBrevoAuthState[K]) => {
      setState((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const clearError = useCallback(() => {
    setStateField('error', null);
  }, [setStateField]);

  const clearSuccess = useCallback(() => {
    setStateField('success', null);
  }, [setStateField]);

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      success: null,
      otpSent: false,
      needsName: false,
      isNewUser: false,
    });
    setTempData(null);
  }, []);

  /**
   * Envoie un code OTP
   */
  const sendOTP = useCallback(
    async (data: {
      recipient: string;
      method: 'email' | 'phone';
      fullName?: string;
    }): Promise<boolean> => {
      const { recipient, method, fullName } = data;

      setStateField('loading', true);
      clearError();
      clearSuccess();

      try {
        const result = await authBrevoService.initiateAuth({
          method,
          [method]: recipient,
          fullName,
        });

        if (result.success) {
          setTempData({ recipient, method });
          setStateField('otpSent', true);
          setStateField(
            'success',
            `Code envoyé par ${method === 'phone' ? 'WhatsApp/SMS' : 'email'} !`
          );
          return true;
        } else {
          setStateField('error', result.error || "Erreur lors de l'envoi du code");
          return false;
        }
      } catch (error) {
        console.error('Erreur sendOTP:', error);
        setStateField('error', 'Erreur technique. Veuillez réessayer.');
        return false;
      } finally {
        setStateField('loading', false);
      }
    },
    [setStateField, clearError, clearSuccess]
  );

  /**
   * Vérifie un code OTP
   */
  const verifyOTP = useCallback(
    async (code: string): Promise<boolean> => {
      if (!tempData) {
        setStateField('error', "Aucune demande d'authentification en cours");
        return false;
      }

      const { recipient, method } = tempData;

      setStateField('loading', true);
      clearError();
      clearSuccess();

      try {
        const result = await authBrevoService.verifyOTP(recipient, code, method);

        if (result.success) {
          if (result.needsName) {
            setStateField('needsName', true);
            setStateField('isNewUser', true);
            setStateField('success', 'Code vérifié ! Veuillez entrer votre nom.');
          } else {
            setStateField('success', result.isNewUser ? 'Compte créé !' : 'Connexion réussie !');

            // Redirection vers le dashboard
            setTimeout(() => {
              navigate('/dashboard');
            }, 1500);
          }
          return true;
        } else {
          setStateField('error', result.error || 'Code invalide ou expiré');
          return false;
        }
      } catch (error) {
        console.error('Erreur verifyOTP:', error);
        setStateField('error', 'Erreur lors de la vérification');
        return false;
      } finally {
        setStateField('loading', false);
      }
    },
    [tempData, setStateField, clearError, clearSuccess, navigate]
  );

  /**
   * Soumet le nom pour la création de compte
   */
  const submitName = useCallback(
    async (fullName: string): Promise<boolean> => {
      if (!tempData || !fullName.trim()) {
        setStateField('error', 'Veuillez entrer un nom valide');
        return false;
      }

      const { recipient, method } = tempData;

      setStateField('loading', true);
      clearError();
      clearSuccess();

      try {
        // Pour l'instant, nous allons créer l'utilisateur directement
        // Dans une vraie implémentation, il faudrait stocker l'OTP et le vérifier

        const result = await authBrevoService.verifyOTP(
          recipient,
          '', // Pas de code ici car on a déjà vérifié
          method,
          fullName.trim()
        );

        if (result.success) {
          setStateField('success', 'Compte créé avec succès !');

          // Redirection vers la sélection de rôle
          setTimeout(() => {
            navigate('/role-selection');
          }, 1500);
          return true;
        } else {
          setStateField('error', result.error || 'Erreur lors de la création du compte');
          return false;
        }
      } catch (error) {
        console.error('Erreur submitName:', error);
        setStateField('error', 'Erreur lors de la création du compte');
        return false;
      } finally {
        setStateField('loading', false);
      }
    },
    [tempData, setStateField, clearError, clearSuccess, navigate]
  );

  /**
   * Sélectionne un rôle utilisateur
   */
  const selectRole = useCallback(
    async (role: 'locataire' | 'proprietaire' | 'agence') => {
      setStateField('loading', true);
      clearError();
      clearSuccess();

      try {
        // Récupérer l'utilisateur courant
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setStateField('error', 'Utilisateur non connecté');
          return;
        }

        const result = await authBrevoService.updateProfileRole(user.id, role);

        if (result.success) {
          setStateField('success', 'Profil configuré ! Redirection...');

          // Redirection selon le rôle - IMPORTANT: Use correct routes matching roleRoutes.ts
          const dashboardRoutes = {
            locataire: '/locataire/dashboard',
            proprietaire: '/proprietaire/dashboard',
            agence: '/agences/dashboard',
          };

          console.log('useBrevoAuth - Redirecting to:', dashboardRoutes[role], 'for role:', role);
          setTimeout(() => {
            navigate(dashboardRoutes[role]);
          }, 1000);
        } else {
          setStateField('error', result.error || 'Erreur lors de la configuration du profil');
        }
      } catch (error) {
        console.error('Erreur selectRole:', error);
        setStateField('error', 'Erreur lors de la configuration du profil');
      } finally {
        setStateField('loading', false);
      }
    },
    [setStateField, clearError, clearSuccess, navigate]
  );

  const actions: UseBrevoAuthActions = {
    sendOTP,
    verifyOTP,
    submitName,
    selectRole,
    clearError,
    clearSuccess,
    reset,
  };

  return {
    ...state,
    ...actions,
  };
}
