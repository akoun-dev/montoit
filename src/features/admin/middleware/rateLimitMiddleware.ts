/**
 * Middleware de Rate Limiting pour les endpoints admin
 *
 * Utilise la fonction Supabase RPC check_rate_limit
 */

import { supabase } from '@/integrations/supabase/client';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: string;
  current: number;
}

export interface RateLimitOptions {
  endpoint?: string;
  maxRequests?: number;
}

/**
 * Vérifie le rate limit pour l'utilisateur actuel
 */
export async function checkRateLimit(
  endpoint: string,
  options?: RateLimitOptions
): Promise<RateLimitResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Non authentifié - toujours autoriser pour les pages publiques
      return {
        allowed: true,
        limit: 0,
        remaining: 0,
        resetAt: new Date().toISOString(),
        current: 0,
      };
    }

    const { data, error } = await supabase.rpc('get_rate_limit_status', {
      p_user_id: user.id,
      p_endpoint: endpoint,
    });

    if (error) {
      console.error('[RateLimit] Error checking rate limit:', error);
      // En cas d'erreur, autoriser par défaut
      return {
        allowed: true,
        limit: 100,
        remaining: 100,
        resetAt: new Date(Date.now() + 60000).toISOString(),
        current: 0,
      };
    }

    return data as RateLimitResult;
  } catch (error) {
    console.error('[RateLimit] Error:', error);
    return {
      allowed: true,
      limit: 100,
      remaining: 100,
      resetAt: new Date(Date.now() + 60000).toISOString(),
      current: 0,
    };
  }
}

/**
 * Hook pour protéger une fonction avec rate limiting
 */
export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
  endpoint: string,
  fn: T
): T {
  return (async (...args: Parameters<T>) => {
    const result = await checkRateLimit(endpoint);

    if (!result.allowed) {
      throw new RateLimitError(
        `Trop de requêtes. Limite: ${result.limit} requêtes par minute. Réessayez dans ${Math.ceil((new Date(result.resetAt).getTime() - Date.now()) / 1000)} secondes.`,
        result
      );
    }

    return fn(...args);
  }) as T;
}

/**
 * Classe d'erreur pour rate limit
 */
export class RateLimitError extends Error {
  public readonly rateLimitInfo: RateLimitResult;

  constructor(message: string, rateLimitInfo: RateLimitResult) {
    super(message);
    this.name = 'RateLimitError';
    this.rateLimitInfo = rateLimitInfo;
  }
}

/**
 * Hook React pour le rate limiting dans les composants
 */
export function useRateLimit(endpoint: string) {
  const [rateLimit, setRateLimit] = useState<RateLimitResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkLimit = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await checkRateLimit(endpoint);
      setRateLimit(result);
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [endpoint]);

  return {
    rateLimit,
    isLoading,
    checkLimit,
    isAllowed: rateLimit?.allowed ?? true,
    remainingRequests: rateLimit?.remaining ?? 0,
    resetAt: rateLimit?.resetAt ? new Date(rateLimit.resetAt) : null,
  };
}

/**
 * Obtenir le temps restant avant reset (en secondes)
 */
export function getResetTimeRemaining(resetAt: string): number {
  const reset = new Date(resetAt).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((reset - now) / 1000));
}

import { useState, useCallback } from 'react';

/**
 * Formater le temps restant pour affichage
 */
export function formatResetTime(resetAt: string): string {
  const seconds = getResetTimeRemaining(resetAt);

  if (seconds < 60) {
    return `${seconds} seconde${seconds > 1 ? 's' : ''}`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }

  const hours = Math.floor(minutes / 60);
  return `${hours} heure${hours > 1 ? 's' : ''}`;
}
