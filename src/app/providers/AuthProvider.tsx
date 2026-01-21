import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError, Provider } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { testDatabaseConnection } from '@/shared/lib/helpers/supabaseHealthCheck';
import { logger } from '@/shared/lib/logger';
import { normalizeUserType, translateUserType } from '@/shared/lib/utils';

type Profile = Database['public']['Tables']['profiles']['Row'];

export type ProfileError = {
  type: 'network' | 'database' | 'not_found' | 'permission' | 'unknown';
  message: string;
  details?: string;
};

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  profileError: ProfileError | null;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    userData: { full_name: string; user_type?: string; phone?: string }
  ) => Promise<{ error: AuthError | null }>;
  signInWithProvider: (provider: Provider) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  clearProfileError: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<ProfileError | null>(null);

  useEffect(() => {
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth loading timeout - forcing loading to false');
        setLoading(false);
      }
    }, 10000); // 10 seconds timeout

    supabase.auth
      .getSession()
      .then(({ data: { session } }: { data: { session: Session | null } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          loadProfile(session.user.id);
        } else {
          setLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      (async () => {
        console.log('Auth state changed:', _event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
          setProfileError(null);
          setLoading(false);
        }
      })();
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, []);

  const loadProfile = async (userId: string, retryCount = 0) => {
    const MAX_RETRIES = 3; // Reduced retries to avoid long loading times
    const RETRY_DELAY = 1000;

    try {
      logger.debug('Loading user profile', {
        userId,
        attempt: retryCount + 1,
        maxRetries: MAX_RETRIES + 1,
      });

      // Skip health check on retries to speed up the process
      if (retryCount === 0) {
        try {
          const healthCheck = await testDatabaseConnection();
          if (!healthCheck.success) {
            logger.error('Database connection failed', undefined, { message: healthCheck.message });
            // Don't set error immediately on first attempt, allow retry
            if (retryCount >= MAX_RETRIES) {
              setProfileError({
                type: 'network',
                message: 'Problème de connexion à la base de données',
                details: healthCheck.message,
              });
              setLoading(false);
            }
            return;
          }
        } catch (healthError) {
          logger.warn(
            'Health check failed, continuing with profile load',
            healthError instanceof Error ? healthError : undefined
          );
        }
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        logger.error('Error loading profile from Supabase', error as Error, { userId });

        if (
          error.message.includes('schema cache') ||
          error.message.includes('Could not find the table')
        ) {
          logger.error('Schema cache error - profiles table not accessible', undefined, { userId });
          setProfileError({
            type: 'database',
            message: 'Connexion à la base de données impossible',
            details:
              "Could not find the table 'public.profiles' in the schema cache\n\nLa table des profils n'existe pas ou n'est pas accessible. Veuillez contacter le support.",
          });
          setLoading(false);
          return;
        }

        if (error.code === 'PGRST116') {
          logger.info('Profile not found, attempting recovery', { userId });
          const recovered = await attemptProfileRecovery(userId);
          if (recovered) {
            return loadProfile(userId, retryCount + 1);
          }

          setProfileError({
            type: 'not_found',
            message: 'Profil introuvable',
            details:
              "Votre profil n'a pas été créé correctement. Tentative de récupération échouée.",
          });
        } else if (error.message.includes('permission') || error.message.includes('denied')) {
          logger.warn('Permission error detected', { userId });

          if (retryCount < MAX_RETRIES) {
            logger.debug('Retrying after permission error', { attempt: retryCount + 1 });
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
            return loadProfile(userId, retryCount + 1);
          }

          setProfileError({
            type: 'permission',
            message: 'Connexion à la base de données impossible',
            details:
              'permission denied for table profiles\n\nVérifiez votre connexion Internet et réessayez dans quelques instants.',
          });
        } else {
          setProfileError({
            type: 'database',
            message: 'Erreur de base de données',
            details: error.message,
          });
        }

        throw error;
      }

      if (!data) {
        logger.warn('No profile found for user', { userId });

        if (retryCount === 0) {
          logger.info('Attempting profile recovery', { userId });
          const recovered = await attemptProfileRecovery(userId);
          if (recovered) {
            return loadProfile(userId, 1);
          }
        }

        if (retryCount < MAX_RETRIES) {
          logger.debug('Retrying profile load', { delay: RETRY_DELAY * (retryCount + 1) });
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
          return loadProfile(userId, retryCount + 1);
        }

        logger.error('Profile not found after all retries', undefined, { userId });
        setProfileError({
          type: 'not_found',
          message: 'Profil introuvable',
          details:
            'Impossible de trouver votre profil après plusieurs tentatives. Veuillez contacter le support.',
        });
        setLoading(false);
        return;
      }

      logger.info('Profile loaded successfully', { userId, email: data.email });
      setProfile(data);
      setProfileError(null);
    } catch (error: unknown) {
      logger.error('Error loading profile', error instanceof Error ? error : undefined, { userId });

      if (retryCount < MAX_RETRIES) {
        logger.debug('Retrying after error', { delay: RETRY_DELAY * (retryCount + 1) });
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
        return loadProfile(userId, retryCount + 1);
      }

      if (!profileError) {
        setProfileError({
          type: 'unknown',
          message: 'Erreur inconnue',
          details: error instanceof Error ? error.message : "Une erreur inattendue s'est produite.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const attemptProfileRecovery = async (userId: string): Promise<boolean> => {
    try {
      logger.info('Attempting to create profile for user', { userId });

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;

      const { error } = await supabase.from('profiles').upsert(
        {
          id: userId,
          user_id: userId,
          email: userData.user.email,
          full_name: userData.user.user_metadata?.['full_name'] || '',
          user_type: translateUserType(userData.user.user_metadata?.['user_type']),
          phone: userData.user.user_metadata?.['phone'] || '',
        },
        { onConflict: 'id' }
      );

      if (error) {
        logger.error('Profile creation failed', error as Error, { userId });
        return false;
      }

      logger.info('Profile created successfully', { userId });
      return true;
    } catch (error) {
      logger.error('Profile recovery exception', error instanceof Error ? error : undefined, {
        userId,
      });
      return false;
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (
    email: string,
    password: string,
    userData: { full_name: string; user_type?: string; phone?: string }
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userData.full_name,
            user_type: normalizeUserType(userData.user_type),
            phone: userData.phone || '',
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) return { error };

      if (data.user && !data.session) {
        return { error: null };
      }

      return { error: null };
    } catch (err: unknown) {
      return { error: err as AuthError };
    }
  };

  const signInWithProvider = async (provider: Provider) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      return { error };
    } catch (err: unknown) {
      return { error: err as AuthError };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;

    const updatesToSend = { ...updates, updated_at: new Date().toISOString() };

    if (updatesToSend.user_type) {
      updatesToSend.user_type = translateUserType(updatesToSend.user_type);
    }

    const { error } = await supabase.from('profiles').update(updatesToSend).eq('id', user.id);

    if (error) throw error;
    await loadProfile(user.id);
  };

  const resetPassword = async (email: string) => {
    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'send-password-reset',
        {
          body: { email },
        }
      );

      if (functionError) {
        logger.error('Error calling send-password-reset', functionError as Error);
        return {
          error: {
            message:
              functionError.message || "Erreur lors de l'envoi de l'email de réinitialisation",
            status: 500,
            name: 'AuthError',
          } as AuthError,
        };
      }

      if (data?.emailNotFound) {
        return {
          error: {
            message: 'Aucun compte associé à cette adresse email',
            status: 404,
            name: 'AuthError',
          } as AuthError,
        };
      }

      if (data?.error) {
        return {
          error: {
            message: data.error,
            status: 500,
            name: 'AuthError',
          } as AuthError,
        };
      }

      return { error: null };
    } catch (err: unknown) {
      logger.error('Password reset exception', err instanceof Error ? err : undefined);
      return {
        error: {
          message: "Erreur lors de l'envoi de l'email de réinitialisation. Veuillez réessayer.",
          status: 500,
          name: 'AuthError',
        } as AuthError,
      };
    }
  };

  const refreshProfile = async () => {
    if (user) {
      setLoading(true);
      setProfileError(null);
      await loadProfile(user.id);
    }
  };

  const clearProfileError = () => {
    setProfileError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        profileError,
        signIn,
        signUp,
        signInWithProvider,
        signOut,
        updateProfile,
        resetPassword,
        refreshProfile,
        clearProfileError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
