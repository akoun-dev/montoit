import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { getClientIP } from '@/lib/ipUtils';
import { useToast } from '@/hooks/use-toast';
import { formatRetryAfter } from '@/lib/ipUtils';
import { logger } from '@/services/logger';

interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  retryAfter?: string;
}

/**
 * Hook pour protéger les actions contre le rate limiting
 * @param endpoint - Nom de l'endpoint à protéger (ex: '/properties/create')
 * @param maxRequests - Nombre maximum de requêtes autorisées
 * @param windowMinutes - Fenêtre de temps en minutes
 */
export const useRateLimitProtection = (
  endpoint: string,
  maxRequests: number = 100,
  windowMinutes: number = 15
) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);

  const checkLimit = async (): Promise<RateLimitResult> => {
    setIsChecking(true);
    
    try {
      const ipAddress = await getClientIP();
      
      const { data, error } = await supabase.rpc('check_api_rate_limit', {
        _endpoint: endpoint,
        _user_id: user?.id || null,
        _ip_address: ipAddress,
        _max_requests: maxRequests,
        _window_minutes: windowMinutes
      });

      if (error) {
        logger.logError(error, { context: 'useRateLimitProtection', action: 'check', endpoint });
        // En cas d'erreur, on autorise l'action pour ne pas bloquer les utilisateurs légitimes
        return { allowed: true };
      }

      if (!data) {
        toast({
          title: "Limite atteinte",
          description: `Vous avez atteint la limite de ${maxRequests} actions en ${windowMinutes} minutes. Veuillez réessayer plus tard.`,
          variant: "destructive"
        });
        
        return {
          allowed: false,
          reason: `Limite de ${maxRequests} actions/${windowMinutes}min atteinte`
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.logError(error, { context: 'useRateLimitProtection', action: 'checkLimit', endpoint });
      // En cas d'erreur, on autorise l'action
      return { allowed: true };
    } finally {
      setIsChecking(false);
    }
  };

  return { checkLimit, isChecking };
};
