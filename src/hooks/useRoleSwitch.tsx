import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from './use-toast';
import { logger } from '@/services/logger';

type UserType = 'locataire' | 'proprietaire' | 'agence' | 'admin_ansut';

export interface UserActiveRoles {
  user_id: string;
  available_roles: UserType[];
  current_role: UserType;
  created_at: string;
  updated_at: string;
}

interface RoleSwitchError {
  type: 'rate_limit' | 'unavailable' | 'network' | 'unauthorized' | 'unknown';
  message: string;
  retryAfter?: number;
}

export const useRoleSwitch = () => {
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [activeRoles, setActiveRoles] = useState<UserActiveRoles | null>(null);
  const [error, setError] = useState<RoleSwitchError | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchActiveRoles = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('user_active_roles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      logger.logError(error, { context: 'useRoleSwitch', action: 'fetchActiveRoles' });
      return;
    }
    
    setActiveRoles(data);
  };

  const parseError = (error: any): RoleSwitchError => {
    const message = error?.message || '';
    
    if (message.includes('Rate limit') || message.includes('Too many')) {
      const match = message.match(/(\d+)\s*(hour|minute)/i);
      const retryAfter = match ? parseInt(match[1]) * (match[2].toLowerCase() === 'hour' ? 60 : 1) : 60;
      return {
        type: 'rate_limit',
        message: 'Trop de changements récents. Veuillez patienter.',
        retryAfter
      };
    }
    
    if (message.includes('not available') || message.includes('pas disponible')) {
      return {
        type: 'unavailable',
        message: 'Ce rôle n\'est pas disponible pour votre compte.'
      };
    }
    
    if (message.includes('NetworkError') || message.includes('Failed to fetch')) {
      return {
        type: 'network',
        message: 'Problème de connexion. Vérifiez votre réseau.'
      };
    }
    
    if (message.includes('Unauthorized') || message.includes('not authenticated')) {
      return {
        type: 'unauthorized',
        message: 'Session expirée. Veuillez vous reconnecter.'
      };
    }
    
    return {
      type: 'unknown',
      message: message || 'Une erreur inattendue s\'est produite.'
    };
  };

  const switchRole = async (newRole: UserType, retry = false) => {
    if (!user) {
      const authError: RoleSwitchError = {
        type: 'unauthorized',
        message: 'Vous devez être connecté'
      };
      setError(authError);
      toast({
        title: "Erreur",
        description: authError.message,
        variant: "destructive",
      });
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('switch-role', {
        body: { newRole }
      });

      if (error) {
        throw error;
      }

      // Succès : réinitialiser le compteur de retry
      setRetryCount(0);
      
      toast({
        title: "✅ Rôle changé",
        description: data.message || `Vous êtes maintenant ${newRole}`,
        duration: 3000,
      });

      await refreshProfile();
      await fetchActiveRoles();
      queryClient.invalidateQueries();
      
      setTimeout(() => {
        window.location.reload();
      }, 500);

    } catch (error: any) {
      const parsedError = parseError(error);
      setError(parsedError);
      
      // Auto-retry pour les erreurs réseau (max 2 tentatives)
      if (parsedError.type === 'network' && retryCount < 2 && !retry) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          switchRole(newRole, true);
        }, 2000);
        
        toast({
          title: "Reconnexion...",
          description: `Tentative ${retryCount + 1}/2`,
        });
        return;
      }
      
      // Afficher le message d'erreur approprié
      const toastDescription = parsedError.retryAfter
        ? `${parsedError.message} Réessayez dans ${parsedError.retryAfter} minute${parsedError.retryAfter > 1 ? 's' : ''}.`
        : parsedError.message;
      
      toast({
        title: "Erreur",
        description: toastDescription,
        variant: "destructive",
        duration: parsedError.type === 'rate_limit' ? 5000 : 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  const addAvailableRole = async (newRole: UserType) => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.rpc('add_available_role', {
        p_user_id: user.id,
        p_new_role: newRole
      });
      
      if (error) throw error;
      
      toast({
        title: "✅ Rôle ajouté",
        description: `Le rôle ${newRole} est maintenant disponible`,
      });
      
      await fetchActiveRoles();
      
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    activeRoles,
    currentRole: activeRoles?.current_role,
    availableRoles: activeRoles?.available_roles || [],
    isLoading,
    error,
    retryCount,
    switchRole,
    addAvailableRole,
    fetchActiveRoles,
    clearError,
    hasMultipleRoles: (activeRoles?.available_roles?.length || 0) > 1,
  };
};
