/**
 * Service API pour l'authentification
 *
 * Ce service centralise tous les appels API liés à l'authentification et à la gestion des utilisateurs.
 */

import { supabase } from '@/services/supabase/client';
import type { Database } from '@/shared/lib/database.types';
import {
  hasPermission,
  requirePermission,
  requireRole,
  hasRole,
} from '@/shared/services/roleValidation.service';
import { rateLimiter, getCurrentUserId } from '@/shared/services/rateLimiter.service';
import { validatePassword } from '@/shared/utils/passwordPolicy';

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: 'tenant' | 'owner';
}

export interface SignInData {
  email: string;
  password: string;
}

export interface OTPVerificationData {
  email: string;
  otp: string;
}

/**
 * API d'authentification
 */
export const authApi = {
  /**
   * Inscription d'un nouvel utilisateur (avec rate limiting et validation du mot de passe)
   */
  signUp: async (data: SignUpData) => {
    const identifier = await getCurrentUserId();
    const rateLimitResult = await rateLimiter.checkLimit(identifier, 'auth:register');

    if (!rateLimitResult.allowed) {
      throw new Error(
        rateLimitResult.message || "Trop de tentatives d'inscription. Réessayez plus tard."
      );
    }

    // Validation du mot de passe
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.isValid) {
      throw new Error(passwordValidation.errors.join(' '));
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          phone: data.phone,
          role: data.role,
        },
      },
    });

    if (authError) throw authError;

    return { data: authData, error: null };
  },

  /**
   * Connexion d'un utilisateur (avec rate limiting)
   */
  signIn: async (data: SignInData) => {
    const identifier = `email:${data.email}`;
    const rateLimitResult = await rateLimiter.checkLimit(identifier, 'auth:login');

    if (!rateLimitResult.allowed) {
      throw new Error(
        rateLimitResult.message || 'Trop de tentatives de connexion. Réessayez plus tard.'
      );
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) throw error;
    return { data: authData, error: null };
  },

  /**
   * Déconnexion
   */
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { data: null, error: null };
  },

  /**
   * Récupère la session courante
   */
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return { data: data.session, error: null };
  },

  /**
   * Récupère l'utilisateur courant
   */
  getCurrentUser: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { data: data.user, error: null };
  },

  /**
   * Envoie un email de réinitialisation de mot de passe (avec rate limiting)
   */
  resetPassword: async (email: string) => {
    const identifier = `email:${email}`;
    const rateLimitResult = await rateLimiter.checkLimit(identifier, 'auth:reset-password');

    if (!rateLimitResult.allowed) {
      throw new Error(
        rateLimitResult.message || 'Trop de demandes de réinitialisation. Réessayez plus tard.'
      );
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
    return { data: null, error: null };
  },

  /**
   * Met à jour le mot de passe (avec validation)
   */
  updatePassword: async (newPassword: string) => {
    // Validation du nouveau mot de passe
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(passwordValidation.errors.join(' '));
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    return { data: null, error: null };
  },

  /**
   * Envoie un OTP par email
   */
  sendOTP: async (email: string, method: 'email' | 'sms' | 'whatsapp' = 'email') => {
    // Appeler l'Edge Function appropriée selon la méthode
    const functionName = method === 'whatsapp' ? 'send-whatsapp-otp' : 'send-otp';

    const { data, error } = await supabase.functions.invoke(functionName, {
      body: { email, method },
    });

    if (error) throw error;
    return { data, error: null };
  },

  /**
   * Vérifie un OTP
   */
  verifyOTP: async (data: OTPVerificationData) => {
    const { data: verifyData, error } = await supabase.functions.invoke('verify-otp', {
      body: data,
    });

    if (error) throw error;
    return { data: verifyData, error: null };
  },

  /**
   * Récupère le profil d'un utilisateur
   */
  getProfile: async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

    if (error) throw error;
    return { data, error: null };
  },

  /**
   * Met à jour le profil d'un utilisateur
   */
  updateProfile: async (userId: string, updates: ProfileUpdate) => {
    // Vérifier que l'utilisateur est autorisé à modifier ce profil
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    // Vérifier si l'utilisateur modifie son propre profil
    if (user.id !== userId) {
      // Si ce n'est pas son profil, vérifier qu'il a les permissions nécessaires
      const canManageUsers = await hasPermission('canManageUsers');
      if (!canManageUsers) {
        throw new Error('Non autorisé à modifier ce profil');
      }
    }

    // Empêcher la modification non autorisée du rôle
    if (updates.user_type && user.id !== userId) {
      const canManageUsers = await hasPermission('canManageUsers');
      if (!canManageUsers) {
        delete updates.user_type; // Supprimer la modification du rôle
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  },

  /**
   * Change le rôle actif d'un utilisateur (sécurisé)
   */
  switchRole: async (userId: string, newRole: string) => {
    // Seuls les admins peuvent changer les rôles
    await requireRole(['admin'])();

    const { data, error } = await supabase
      .from('profiles')
      .update({ user_type: newRole })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  },

  /**
   * Vérifie si un email existe déjà
   */
  emailExists: async (email: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (error) throw error;
    return { data: !!data, error: null };
  },

  /**
   * Connexion avec Google
   */
  signInWithGoogle: async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) throw error;
    return { data, error: null };
  },
};
