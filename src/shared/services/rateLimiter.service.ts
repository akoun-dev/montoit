/**
 * Service de rate limiting pour sécuriser les API
 *
 * Ce service implémente différentes stratégies de limitation de débit
 * pour protéger contre les abus et les attaques par déni de service.
 */

interface RateLimitConfig {
  windowMs: number; // Fenêtre de temps en millisecondes
  maxRequests: number; // Nombre maximum de requêtes autorisées
  message?: string; // Message d'erreur personnalisé
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

class RateLimiterService {
  private static instance: RateLimiterService;
  private store = new Map<string, RateLimitEntry>();

  // Configurations par type d'opération
  private configs: Record<string, RateLimitConfig> = {
    // Authentification
    'auth:login': {
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
      message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
    },
    'auth:register': {
      windowMs: 60 * 60 * 1000,
      maxRequests: 3,
      message: "Trop de tentatives d'inscription. Réessayez dans 1 heure.",
    },
    'auth:reset-password': {
      windowMs: 15 * 60 * 1000,
      maxRequests: 3,
      message: 'Trop de demandes de réinitialisation. Réessayez dans 15 minutes.',
    },

    // Upload
    'upload:file': {
      windowMs: 60 * 1000,
      maxRequests: 10,
      message: "Trop d'uploads. Attendez avant de continuer.",
    },
    'upload:image': {
      windowMs: 60 * 1000,
      maxRequests: 20,
      message: "Téléversement d'images limité.",
    },

    // Messagerie
    'message:send': {
      windowMs: 60 * 1000,
      maxRequests: 30,
      message: 'Trop de messages envoyés. Attendez avant de continuer.',
    },
    'message:conversation': {
      windowMs: 10 * 60 * 1000,
      maxRequests: 5,
      message: 'Trop de conversations créées. Réessayez plus tard.',
    },

    // Opérations CRUD générales
    'crud:create': {
      windowMs: 60 * 1000,
      maxRequests: 20,
      message: 'Trop de créations. Veuillez ralentir.',
    },
    'crud:update': {
      windowMs: 60 * 1000,
      maxRequests: 50,
      message: 'Trop de mises à jour. Veuillez ralentir.',
    },
    'crud:delete': {
      windowMs: 60 * 1000,
      maxRequests: 10,
      message: 'Trop de suppressions. Veuillez ralentir.',
    },

    // Recherche
    'search:general': {
      windowMs: 60 * 1000,
      maxRequests: 100,
      message: 'Trop de recherches. Veuillez ralentir.',
    },

    // API publique
    'public:properties': {
      windowMs: 60 * 1000,
      maxRequests: 200,
      message: 'Limite de requêtes dépassée.',
    },

    // Admin
    'admin:general': { windowMs: 60 * 1000, maxRequests: 300, message: 'Limite admin dépassée.' },
  };

  private constructor() {
    // Nettoyer périodiquement les entrées expirées
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  static getInstance(): RateLimiterService {
    if (!RateLimiterService.instance) {
      RateLimiterService.instance = new RateLimiterService();
    }
    return RateLimiterService.instance;
  }

  /**
   * Génère une clé unique pour le rate limiting
   */
  private getKey(identifier: string, operation: string): string {
    return `${identifier}:${operation}`;
  }

  /**
   * Vérifie et met à jour le rate limit
   */
  async checkLimit(
    identifier: string,
    operation: string
  ): Promise<{ allowed: boolean; resetTime?: number; message?: string }> {
    const config = this.configs[operation];
    if (!config) {
      // Si pas de config, autoriser par défaut
      return { allowed: true };
    }

    const key = this.getKey(identifier, operation);
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry) {
      // Première requête
      this.store.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
        blocked: false,
      });
      return { allowed: true };
    }

    // Vérifier si la fenêtre de temps est expirée
    if (now > entry.resetTime) {
      // Réinitialiser
      this.store.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
        blocked: false,
      });
      return { allowed: true };
    }

    // Vérifier si l'utilisateur est bloqué
    if (entry.blocked) {
      return {
        allowed: false,
        resetTime: entry.resetTime,
        message: 'Vous êtes temporairement bloqué. Réessayez plus tard.',
      };
    }

    // Incrémenter le compteur
    entry.count++;

    // Vérifier la limite
    if (entry.count > config.maxRequests) {
      // Bloquer l'utilisateur
      entry.blocked = true;
      entry.resetTime = now + config.windowMs;

      // Log du blocage pour monitoring
      console.warn(`Rate limit exceeded for ${key}: ${entry.count}/${config.maxRequests}`);

      return {
        allowed: false,
        resetTime: entry.resetTime,
        message: config.message || 'Limite de requêtes dépassée.',
      };
    }

    // Mettre à jour l'entrée
    this.store.set(key, entry);
    return { allowed: true };
  }

  /**
   * Middleware pour Express/Route handlers
   */
  createMiddleware(operation: string, identifierGenerator?: (req: any) => string) {
    return async (req: any, res: any, next: any) => {
      const identifier = identifierGenerator
        ? identifierGenerator(req)
        : this.getDefaultIdentifier(req);

      const result = await this.checkLimit(identifier, operation);

      if (!result.allowed) {
        res.status(429).json({
          error: 'Too Many Requests',
          message: result.message,
          resetTime: result.resetTime,
        });
        return;
      }

      // Ajouter les headers de rate limit
      const config = this.configs[operation];
      if (config) {
        const key = this.getKey(identifier, operation);
        const entry = this.store.get(key);
        if (entry) {
          res.set({
            'X-RateLimit-Limit': config.maxRequests,
            'X-RateLimit-Remaining': Math.max(0, config.maxRequests - entry.count),
            'X-RateLimit-Reset': Math.ceil(entry.resetTime / 1000),
          });
        }
      }

      next();
    };
  }

  /**
   * Obtient l'identifiant par défaut depuis la requête
   */
  private getDefaultIdentifier(req: any): string {
    // Essayer d'obtenir l'ID utilisateur depuis la session/ auth
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }

    // Utiliser l'IP comme fallback
    const ip =
      req.ip ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      'unknown';

    return `ip:${ip}`;
  }

  /**
   * Décorateur pour les fonctions async
   */
  rateLimit(operation: string, identifierGenerator?: () => Promise<string>) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const identifier = identifierGenerator
          ? await identifierGenerator()
          : await this.getCurrentUserId();

        const result = await RateLimiterService.getInstance().checkLimit(identifier, operation);

        if (!result.allowed) {
          throw new Error(result.message || 'Rate limit exceeded');
        }

        return originalMethod.apply(this, args);
      };

      return descriptor;
    };
  }

  /**
   * Nettoie les entrées expirées
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Réinitialise manuellement un rate limit
   */
  async resetLimit(identifier: string, operation: string): Promise<void> {
    const key = this.getKey(identifier, operation);
    this.store.delete(key);
  }

  /**
   * Obtient les statistiques actuelles
   */
  getStats(identifier: string, operation: string): RateLimitEntry | null {
    const key = this.getKey(identifier, operation);
    return this.store.get(key) || null;
  }

  /**
   * Vérifie si un IP est dans une liste noire (protection DDOS)
   */
  private blacklistedIPs = new Set<string>();

  isBlacklisted(ip: string): boolean {
    return this.blacklistedIPs.has(ip);
  }

  addToBlacklist(ip: string, duration = 24 * 60 * 60 * 1000): void {
    this.blacklistedIPs.add(ip);
    setTimeout(() => {
      this.blacklistedIPs.delete(ip);
    }, duration);
  }

  /**
   * Protection contre les attaques par force brute
   */
  async checkBruteForce(
    identifier: string,
    operation: string,
    maxAttempts = 5,
    lockoutDuration = 15 * 60 * 1000
  ): Promise<boolean> {
    const key = `bruteforce:${identifier}:${operation}`;
    const entry = this.store.get(key);

    if (!entry) {
      this.store.set(key, {
        count: 1,
        resetTime: Date.now() + lockoutDuration,
        blocked: false,
      });
      return true;
    }

    if (Date.now() > entry.resetTime) {
      this.store.set(key, {
        count: 1,
        resetTime: Date.now() + lockoutDuration,
        blocked: false,
      });
      return true;
    }

    entry.count++;

    if (entry.count >= maxAttempts) {
      entry.blocked = true;
      entry.resetTime = Date.now() + lockoutDuration;
      return false;
    }

    this.store.set(key, entry);
    return true;
  }
}

export const rateLimiter = RateLimiterService.getInstance();

/**
 * Hook React pour le rate limiting côté client
 */
export function useRateLimiter() {
  const checkRateLimit = async (
    operation: string
  ): Promise<{ allowed: boolean; resetTime?: number }> => {
    // Utiliser l'ID localStorage comme identifiant client
    const clientId = localStorage.getItem('client-id') || Math.random().toString(36).substring(7);
    localStorage.setItem('client-id', clientId);

    const identifier = `client:${clientId}`;
    return rateLimiter.checkLimit(identifier, operation);
  };

  return { checkRateLimit };
}

/**
 * Méthode utilitaire pour obtenir l'ID utilisateur courant
 */
export async function getCurrentUserId(): Promise<string> {
  try {
    const { supabase } = await import('@/services/supabase/client');
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id || 'anonymous';
  } catch {
    return 'anonymous';
  }
}
