/**
 * Hook d'authentification sécurisé
 *
 * Ce hook encapsule toutes les opérations d'authentification avec gestion
 * des erreurs et rate limiting côté client.
 */

import { useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { authApi, type SignInData, type SignUpData } from '@/features/auth/services/auth.api';
import { useRateLimiter } from '@/shared/services/rateLimiter.service';
import { useAuthStore } from '@/store/authStore';

export function useSecureAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const { checkRateLimit } = useRateLimiter();
  const { setUser, setSession } = useAuthStore();

  // Mutation pour l'inscription avec rate limiting
  const signUpMutation = useMutation({
    mutationFn: async (data: SignUpData) => {
      // Vérifier le rate limit côté client
      const rateLimitResult = await checkRateLimit('auth:register');
      if (!rateLimitResult.allowed) {
        throw new Error(rateLimitResult.message || "Trop de tentatives d'inscription");
      }

      setIsLoading(true);
      try {
        const result = await authApi.signUp(data);
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: (data) => {
      if (data.data.user) {
        setUser(data.data.user);
        setSession(data.data.session);
        toast.success('Inscription réussie !');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de l'inscription");
    },
  });

  // Mutation pour la connexion avec rate limiting
  const signInMutation = useMutation({
    mutationFn: async (data: SignInData) => {
      // Vérifier le rate limit côté client
      const rateLimitResult = await checkRateLimit('auth:login');
      if (!rateLimitResult.allowed) {
        throw new Error(rateLimitResult.message || 'Trop de tentatives de connexion');
      }

      setIsLoading(true);
      try {
        const result = await authApi.signIn(data);
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: (data) => {
      if (data.data.user) {
        setUser(data.data.user);
        setSession(data.data.session);
        toast.success('Connexion réussie !');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la connexion');
    },
  });

  // Mutation pour la réinitialisation du mot de passe
  const resetPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      // Vérifier le rate limit côté client
      const rateLimitResult = await checkRateLimit('auth:reset-password');
      if (!rateLimitResult.allowed) {
        throw new Error(rateLimitResult.message || 'Trop de demandes de réinitialisation');
      }

      return authApi.resetPassword(email);
    },
    onSuccess: () => {
      toast.success('Email de réinitialisation envoyé');
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de l'envoi");
    },
  });

  // Mutation pour la déconnexion
  const signOutMutation = useMutation({
    mutationFn: () => authApi.signOut(),
    onSuccess: () => {
      setUser(null);
      setSession(null);
      toast.success('Déconnexion réussie');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la déconnexion');
    },
  });

  // Fonction pour l'inscription
  const signUp = useCallback(
    async (data: SignUpData) => {
      return signUpMutation.mutateAsync(data);
    },
    [signUpMutation]
  );

  // Fonction pour la connexion
  const signIn = useCallback(
    async (data: SignInData) => {
      return signInMutation.mutateAsync(data);
    },
    [signInMutation]
  );

  // Fonction pour la déconnexion
  const signOut = useCallback(async () => {
    return signOutMutation.mutateAsync();
  }, [signOutMutation]);

  // Fonction pour la réinitialisation du mot de passe
  const resetPassword = useCallback(
    async (email: string) => {
      return resetPasswordMutation.mutateAsync(email);
    },
    [resetPasswordMutation]
  );

  return {
    signUp,
    signIn,
    signOut,
    resetPassword,
    isLoading,
    isSigningUp: signUpMutation.isPending,
    isSigningIn: signInMutation.isPending,
    isResetting: resetPasswordMutation.isPending,
  };
}

/**
 * Hook pour les opérations de profil utilisateur sécurisées
 */
export function useSecureProfile() {
  const { checkRateLimit } = useRateLimiter();
  const { user } = useAuthStore();

  // Mutation pour la mise à jour du profil
  const updateProfileMutation = useMutation({
    mutationFn: async ({ updates, profileId }: { updates: any; profileId: string }) => {
      // Vérifier le rate limit
      const rateLimitResult = await checkRateLimit('crud:update');
      if (!rateLimitResult.allowed) {
        throw new Error(rateLimitResult.message || 'Trop de mises à jour');
      }

      // Validation des entrées
      const sanitizedUpdates = {
        ...updates,
        full_name: updates.full_name?.replace(/<[^>]*>/g, '').trim(),
        bio: updates.bio?.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim(),
      };

      return authApi.updateProfile(profileId || user?.id || '', sanitizedUpdates);
    },
    onSuccess: () => {
      toast.success('Profil mis à jour');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    },
  });

  const updateProfile = useCallback(
    (updates: any, profileId?: string) => {
      return updateProfileMutation.mutateAsync({ updates, profileId });
    },
    [updateProfileMutation]
  );

  return {
    updateProfile,
    isUpdating: updateProfileMutation.isPending,
  };
}
