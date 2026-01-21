/**
 * Middleware de sécurité pour l'application
 *
 * Ce fichier fournit des middlewares de sécurité pour protéger les routes
 * contre les attaques courantes et ajouter des headers de sécurité.
 */

import { rateLimiter } from '@/shared/services/rateLimiter.service';
import { getCurrentUserId } from '@/shared/services/rateLimiter.service';

/**
 * Sécurité headers middleware
 */
export function addSecurityHeaders(response: Response) {
  const headers = {
    // Prévenir le clickjacking
    'X-Frame-Options': 'DENY',

    // Prévenir le MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Activer XSS protection
    'X-XSS-Protection': '1; mode=block',

    // Politique de référent
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Politique de sécurité de contenu (CSP)
    'Content-Security-Policy': `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      font-src 'self' https://fonts.gstatic.com;
      img-src 'self' data: blob: https:;
      connect-src 'self' https://api.supabase.co https://*.supabase.co;
      frame-ancestors 'none';
    `
      .replace(/\s+/g, ' ')
      .trim(),

    // Permissions Policy
    'Permissions-Policy': `
      camera=(),
      microphone=(),
      geolocation=(self),
      payment=(),
      usb=(),
      magnetometer=(),
      gyroscope=()
    `
      .replace(/\s+/g, ' ')
      .trim(),
  };

  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
}

/**
 * Validation des entrées contre les injections
 */
export class InputValidator {
  /**
   * Nettoie une chaîne de caractères
   */
  static sanitizeString(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Supprimer les scripts
      .replace(/javascript:/gi, '') // Supprimer les protocoles javascript
      .replace(/on\w+\s*=/gi, '') // Supprimer les gestionnaires d'événements
      .trim();
  }

  /**
   * Valide un email
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Valide un numéro de téléphone
   */
  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone);
  }

  /**
   * Valide un ID UUID
   */
  static isValidUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  /**
   * Limite la longueur d'une chaîne
   */
  static limitLength(input: string, maxLength: number): string {
    return input.substring(0, maxLength);
  }

  /**
   * Valide un objet contre un schéma
   */
  static validateObject(obj: any, schema: Record<string, (value: any) => boolean>): boolean {
    for (const [key, validator] of Object.entries(schema)) {
      if (!(key in obj) || !validator(obj[key])) {
        return false;
      }
    }
    return true;
  }
}

/**
 * Protection CSRF (Cross-Site Request Forgery)
 */
export class CSRFProtection {
  private static tokens = new Map<string, { token: string; expires: number }>();

  /**
   * Génère un token CSRF
   */
  static generateToken(userId: string): string {
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expires = Date.now() + 60 * 60 * 1000; // 1 heure

    this.tokens.set(userId, { token, expires });
    return token;
  }

  /**
   * Valide un token CSRF
   */
  static validateToken(userId: string, token: string): boolean {
    const stored = this.tokens.get(userId);
    if (!stored) return false;

    if (Date.now() > stored.expires) {
      this.tokens.delete(userId);
      return false;
    }

    return stored.token === token;
  }

  /**
   * Nettoie les tokens expirés
   */
  static cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.tokens.entries()) {
      if (now > value.expires) {
        this.tokens.delete(key);
      }
    }
  }
}

// Nettoyer les tokens CSRF toutes les heures
setInterval(() => CSRFProtection.cleanup(), 60 * 60 * 1000);

/**
 * Middleware de rate limiting pour les routes API
 */
export async function apiRateLimit(operation: string): Promise<void> {
  const identifier = await getCurrentUserId();
  const result = await rateLimiter.checkLimit(identifier, operation);

  if (!result.allowed) {
    throw new Error(result.message || 'Rate limit exceeded');
  }
}

/**
 * Middleware de validation CORS
 */
export function corsMiddleware(request: Request, response: Response) {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:8080',
    'https://montoit.ci',
    'https://www.montoit.ci',
  ];

  if (allowedOrigins.includes(origin || '')) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400');
}

/**
 * Middleware de logging pour la sécurité
 */
export class SecurityLogger {
  private static logs: Array<{
    timestamp: Date;
    level: 'INFO' | 'WARN' | 'ERROR';
    event: string;
    userId?: string;
    ip?: string;
    details?: any;
  }> = [];

  static log(
    level: 'INFO' | 'WARN' | 'ERROR',
    event: string,
    details?: any,
    userId?: string,
    ip?: string
  ) {
    const log = {
      timestamp: new Date(),
      level,
      event,
      userId,
      ip,
      details,
    };

    this.logs.push(log);

    // Garder seulement les 1000 derniers logs
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }

    // En environnement de développement, logger dans la console
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${level}] ${event}`, details);
    }

    // Pour la production, envoyer vers un service de logging
    // TODO: Implémenter l'envoi vers Sentry, LogRocket, etc.
  }

  static async logSecurityEvent(event: string, userId?: string, ip?: string, details?: any) {
    this.log('WARN', `SECURITY: ${event}`, details, userId, ip);

    // Pour les événements de sécurité critiques, on pourrait vouloir
    // alerter un admin ou bloquer temporairement l'utilisateur
    if (event.includes('BLOCKED') || event.includes('ATTACK')) {
      // TODO: Implémenter une alerte admin
    }
  }

  static getRecentLogs(minutes = 60): typeof this.logs {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.logs.filter((log) => log.timestamp > cutoff);
  }

  static getSecurityEvents(hours = 24): typeof this.logs {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.logs.filter((log) => log.timestamp > cutoff && log.event.includes('SECURITY'));
  }
}

/**
 * Middleware principal de sécurité pour les routes API
 */
export async function securityMiddleware(
  request: Request,
  response: Response,
  operation: string
): Promise<void> {
  try {
    // Ajouter les headers de sécurité
    addSecurityHeaders(response);

    // Valider CORS
    corsMiddleware(request, response);

    // Rate limiting
    await apiRateLimit(operation);

    // Logger la requête
    const ip =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    SecurityLogger.log('INFO', `API_REQUEST: ${operation}`, null, undefined, ip);
  } catch (error: any) {
    SecurityLogger.logSecurityEvent('RATE_LIMIT_EXCEEDED', undefined, undefined, {
      operation,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Décorateur pour sécuriser les méthodes de service
 */
export function secure(operation: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Appliquer le middleware de sécurité
      await apiRateLimit(operation);

      // Valider les entrées si nécessaire
      if (args.length > 0 && typeof args[0] === 'object') {
        const sanitized = Array.isArray(args[0])
          ? args[0].map((arg) =>
              typeof arg === 'string' ? InputValidator.sanitizeString(arg) : arg
            )
          : Object.fromEntries(
              Object.entries(args[0]).map(([key, value]) => [
                key,
                typeof value === 'string' ? InputValidator.sanitizeString(value) : value,
              ])
            );
        args[0] = sanitized;
      }

      // Exécuter la méthode originale
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Types pour la configuration de sécurité
 */
export interface SecurityConfig {
  enableRateLimit: boolean;
  enableCORS: boolean;
  enableCSRF: boolean;
  enableSecurityHeaders: boolean;
  logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  customHeaders?: Record<string, string>;
}

export const defaultSecurityConfig: SecurityConfig = {
  enableRateLimit: true,
  enableCORS: true,
  enableCSRF: true,
  enableSecurityHeaders: true,
  logLevel: 'INFO',
};

/**
 * Export des utilitaires
 */
export { rateLimiter } from '@/shared/services/rateLimiter.service';
export { getCurrentUserId } from '@/shared/services/rateLimiter.service';
