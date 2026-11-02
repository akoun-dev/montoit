import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User, Session, AuthError, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { testDatabaseConnection } from '@/shared/lib/helpers/supabaseHealthCheck';
import { logger } from '@/shared/lib/logger';

type Profile = Database['public']['Tables']['profiles']['Row'];

export type ProfileLoadError = {
  type: 'network' | 'database' | 'not_found' | 'permission' | 'timeout' | 'unknown';
  message: string;
  details?: string;
  timestamp: Date;
};

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  error: AuthError | null;
  profileError: ProfileLoadError | null;
  retryCount: number;

  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    userData: { full_name: string; user_type: string }
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  loadProfile: (userId: string, retry?: number) => Promise<void>;
  clearError: () => void;
  clearProfileError: () => void;
  forceRefresh: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        profile: null,
        session: null,
        loading: true,
        initialized: false,
        error: null,
        profileError: null,
        retryCount: 0,

        initialize: async () => {
          try {
            const {
              data: { session },
            } = await supabase.auth.getSession();

            if (session?.user) {
              set({ session, user: session.user });
              await get().loadProfile(session.user.id);
            }

            set({ initialized: true, loading: false });

            // Set up auth state listener
            supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
              (async () => {
                set({ session, user: session?.user ?? null });
                if (session?.user) {
                  await get().loadProfile(session.user.id);
                } else {
                  set({ profile: null, loading: false });
                }
              })();
            });
          } catch (error) {
            logger.error('Error initializing auth', error instanceof Error ? error : undefined);
            set({ initialized: true, loading: false });
          }
        },

        loadProfile: async (userId: string, retryAttempt = 0) => {
          const MAX_RETRIES = 5;
          const BASE_RETRY_DELAY = 1500;

          try {
            logger.debug('Loading profile', {
              userId,
              attempt: retryAttempt + 1,
              maxRetries: MAX_RETRIES + 1,
            });
            set({ retryCount: retryAttempt });

            if (retryAttempt === 0) {
              const healthCheck = await testDatabaseConnection();
              if (!healthCheck.success) {
                logger.error('Database connection failed', undefined, {
                  message: healthCheck.message,
                });
                set({
                  profileError: {
                    type: 'network',
                    message: 'Connexion à la base de données impossible',
                    details: healthCheck.message,
                    timestamp: new Date(),
                  },
                  loading: false,
                });
                return;
              }
            }

            const { data, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .maybeSingle();

            if (error) {
              logger.error('Supabase error loading profile', error as Error, {
                userId,
                code: error.code,
              });

              let errorType: ProfileLoadError['type'] = 'database';
              let errorMessage = 'Erreur lors du chargement du profil';
              let errorDetails = error.message;

              if (error.code === 'PGRST116') {
                errorType = 'not_found';
                errorMessage = 'Profil introuvable';
                errorDetails = "Le profil n'a pas été trouvé dans la base de données.";
              } else if (error.message.includes('permission') || error.code === '42501') {
                errorType = 'permission';
                errorMessage = 'Accès refusé';
                errorDetails = 'Permissions insuffisantes pour accéder au profil.';
              } else if (error.message.includes('network') || error.message.includes('fetch')) {
                errorType = 'network';
                errorMessage = 'Erreur de connexion';
                errorDetails = 'Impossible de se connecter au serveur.';
              }

              if (retryAttempt < MAX_RETRIES) {
                const delay = BASE_RETRY_DELAY * Math.pow(1.5, retryAttempt);
                logger.debug('Retrying profile load', { delay, attempt: retryAttempt + 1 });
                await new Promise((resolve) => setTimeout(resolve, delay));
                return get().loadProfile(userId, retryAttempt + 1);
              }

              set({
                profileError: {
                  type: errorType,
                  message: errorMessage,
                  details: errorDetails,
                  timestamp: new Date(),
                },
                loading: false,
              });
              return;
            }

            if (!data) {
              logger.warn('No profile data returned', { userId });

              if (retryAttempt < MAX_RETRIES) {
                const delay = BASE_RETRY_DELAY * Math.pow(1.5, retryAttempt);
                logger.debug('Profile not found, retrying', { delay, attempt: retryAttempt + 1 });
                await new Promise((resolve) => setTimeout(resolve, delay));
                return get().loadProfile(userId, retryAttempt + 1);
              }

              set({
                profileError: {
                  type: 'not_found',
                  message: 'Profil introuvable',
                  details: 'Impossible de trouver votre profil après plusieurs tentatives.',
                  timestamp: new Date(),
                },
                loading: false,
              });
              return;
            }

            logger.info('Profile loaded successfully', { userId });
            set({ profile: data, loading: false, profileError: null, retryCount: 0 });
          } catch (error: unknown) {
            logger.error(
              'Unexpected error loading profile',
              error instanceof Error ? error : undefined,
              { userId }
            );

            if (retryAttempt < MAX_RETRIES) {
              const delay = BASE_RETRY_DELAY * Math.pow(1.5, retryAttempt);
              logger.debug('Retrying after error', { delay, attempt: retryAttempt + 1 });
              await new Promise((resolve) => setTimeout(resolve, delay));
              return get().loadProfile(userId, retryAttempt + 1);
            }

            set({
              profileError: {
                type: 'unknown',
                message: 'Erreur inattendue',
                details:
                  error instanceof Error ? error.message : "Une erreur inconnue s'est produite.",
                timestamp: new Date(),
              },
              loading: false,
            });
          }
        },

        signIn: async (email: string, password: string) => {
          set({ loading: true, error: null });

          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            set({ error, loading: false });
          }

          return { error };
        },

        signUp: async (
          email: string,
          password: string,
          userData: { full_name: string; user_type: string }
        ) => {
          set({ loading: true, error: null });

          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: userData.full_name,
                user_type: userData.user_type,
              },
            },
          });

          if (error) {
            set({ error, loading: false });
          }

          return { error };
        },

        signOut: async () => {
          set({ loading: true });

          await supabase.auth.signOut();
          set({
            user: null,
            profile: null,
            session: null,
            loading: false,
            error: null,
          });
        },

        updateProfile: async (updates: Partial<Profile>) => {
          const { user } = get();
          if (!user) return;

          set({ loading: true, error: null });

          try {
            const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);

            if (error) throw error;
            await get().loadProfile(user.id);
          } catch (error) {
            logger.error('Error updating profile', error instanceof Error ? error : undefined);
            set({ loading: false });
          }
        },

        clearError: () => set({ error: null }),
        clearProfileError: () => set({ profileError: null }),

        forceRefresh: async () => {
          const { user } = get();
          if (user) {
            set({ loading: true, profileError: null, retryCount: 0 });
            await get().loadProfile(user.id);
          }
        },
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          session: state.session,
        }),
      }
    ),
    { name: 'AuthStore' }
  )
);
