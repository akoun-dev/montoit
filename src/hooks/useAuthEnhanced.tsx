import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/services/logger';
import type { Profile } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: string[];
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, userType: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to log login attempts
const logLoginAttempt = async (email: string, success: boolean, errorMessage?: string) => {
  try {
    // Direct table insert instead of RPC call to avoid type issues
    const { error } = await supabase
      .from('login_attempts')
      .insert({
        email,
        success,
        error_message: errorMessage || null,
        ip_address: null, // You can get this from a service if needed
        user_agent: navigator.userAgent
      });
    
    if (error) {
      logger.warn('Failed to log login attempt', { error, email, success });
    }
  } catch (error) {
    logger.warn('Error logging login attempt', { error, email, success });
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    logger.info('Fetching profile for user', { userId });
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        logger.error('Error fetching profile', { error, userId });
        
        // If profile doesn't exist, create it
        if (error.code === 'PGRST116') {
          logger.info('Profile not found, creating new one', { userId });
          const { data: userData } = await supabase.auth.getUser();
          if (userData.user?.user_metadata) {
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                full_name: userData.user.user_metadata.full_name || userData.user.email,
                user_type: userData.user.user_metadata.user_type || 'individual'
              });
            
            if (!insertError) {
              // Retry fetching the profile
              return await fetchProfile(userId);
            }
          }
        }
        return null;
      }
      
      logger.info('Profile fetched successfully', { userId });
      return data;
    } catch (error) {
      logger.error('Unexpected error fetching profile', { error, userId });
      return null;
    }
  };

  const fetchUserRoles = async (userId: string) => {
    logger.info('Fetching roles for user', { userId });
    
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        logger.error('Error fetching roles', { error, userId });
        
        // If no roles found, assign default role
        if (error.code === 'PGRST116') {
          logger.info('No roles found, assigning default role', { userId });
          const { error: insertError } = await supabase
            .from('user_roles')
            .insert({
              user_id: userId,
              role: 'user'
            });
          
          if (!insertError) {
            return ['user'];
          }
        }
        return [];
      }
      
      logger.info('Roles fetched successfully', { userId, roles: data });
      return data?.map(r => r.role) || [];
    } catch (error) {
      logger.error('Unexpected error fetching roles', { error, userId });
      return ['user']; // Default role as fallback
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
      const userRoles = await fetchUserRoles(user.id);
      setRoles(userRoles);
    }
  };

  useEffect(() => {
    logger.info('Setting up auth listener');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.info('Auth state changed', { event, hasSession: !!session });
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer profile fetching to avoid deadlock
          setTimeout(async () => {
            const profileData = await fetchProfile(session.user.id);
            setProfile(profileData);
            const userRoles = await fetchUserRoles(session.user.id);
            setRoles(userRoles);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      logger.info('Initial session check', { hasSession: !!session });
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(async () => {
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
          const userRoles = await fetchUserRoles(session.user.id);
          setRoles(userRoles);
          setLoading(false);
          logger.info('Auth loading complete');
        }, 0);
      } else {
        setLoading(false);
        logger.info('No session, loading complete');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, userType: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            user_type: userType,
          }
        }
      });

      if (error) {
        await logLoginAttempt(email, false, error.message);
        toast({
          title: "Erreur d'inscription",
          description: error.message,
          variant: "destructive",
        });
      } else {
        await logLoginAttempt(email, true);
        toast({
          title: "Inscription réussie",
          description: "Votre compte a été créé avec succès !",
        });
      }

      return { error };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      await logLoginAttempt(email, false, errorMessage);
      toast({
        title: "Erreur d'inscription",
        description: errorMessage,
        variant: "destructive",
      });
      return { error: error as AuthError };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        await logLoginAttempt(email, false, error.message);
        toast({
          title: "Erreur de connexion",
          description: error.message,
          variant: "destructive",
        });
      } else {
        await logLoginAttempt(email, true);
        toast({
          title: "Connexion réussie",
          description: "Bienvenue sur Mon Toit !",
        });
      }

      return { error };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      await logLoginAttempt(email, false, errorMessage);
      toast({
        title: "Erreur de connexion",
        description: errorMessage,
        variant: "destructive",
      });
      return { error: error as AuthError };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (!error) {
        setRoles([]);
        
        // ✅ SÉCURITÉ : Nettoyer le cache lors de la déconnexion
        const { clearCacheOnLogout } = await import('@/lib/queryClient');
        clearCacheOnLogout();
        
        toast({
          title: "Déconnexion",
          description: "À bientôt sur Mon Toit !",
        });
      } else {
        logger.error('Error during sign out', { error });
      }
    } catch (error) {
      logger.error('Unexpected error during sign out', { error });
    }
  };

  const hasRole = (role: string): boolean => {
    return roles.includes(role);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, roles, loading, signUp, signIn, signOut, refreshProfile, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
