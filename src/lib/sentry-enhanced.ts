/**
 * Configuration Sentry améliorée pour la plateforme Mon Toit
 * Includes security monitoring, performance tracking, and user feedback
 */

import React from 'react';
import {
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes
} from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { detectSuspiciousContent } from './sanitize';

// Configuration de Sentry pour l'environnement de production
const SENTRY_CONFIG = {
  dsn: import.meta.env.VITE_SENTRY_DSN || 'https://example@sentry.io/project-id',
  environment: import.meta.env.MODE || 'development',
  release: `mon-toit@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,

  // Performance monitoring - BrowserTracing requires separate package
  // integrations: [
  //   new BrowserTracing({
  //     // Routing instrumentation pour le tracking des pages
  //     routingInstrumentation: Sentry.reactRouterV6Instrumentation(
  //       React.useEffect,
  //       useLocation,
  //       useNavigationType,
  //       createRoutesFromChildren,
  //       matchRoutes
  //     ),
  //     // Custom tracing pour les appels API
  //     tracingOrigins: [
  //       'localhost',
  //       /^\//,
  //       /^https:\/\/.*\.supabase\.co/,
  //       /^https:\/\/api\.mapbox\.com/
  //     ],
  //   }),
  // ],

  // Sample rate pour le tracing (désactivé sans BrowserTracing)
  // tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

  // Configuration de sécurité
  beforeSend(event) {
    // Filtrer les données sensibles
    if (event.exception) {
      event.exception.values?.forEach(exception => {
        if (exception.stacktrace) {
          exception.stacktrace.frames = exception.stacktrace.frames?.map(frame => ({
            ...frame,
            // Supprimer les potentielles données sensibles des noms de fichiers
            filename: frame.filename?.replace(/\/home\/[^\/]+/g, '/home/USER')
          }));
        }
      });
    }

    // Filtrer les requêtes réseau sensibles
    if (event.request?.url) {
      const url = new URL(event.request.url);
      if (url.pathname.includes('/auth/') || url.pathname.includes('/admin/')) {
        event.request.headers = Object.fromEntries(
          Object.entries(event.request.headers || {}).filter(([key]) =>
            !['authorization', 'cookie', 'x-api-key'].includes(key.toLowerCase())
          )
        );
      }
    }

    // Détection de contenu suspect dans les erreurs
    if (event.exception || event.message) {
      const errorContent = event.message ||
        event.exception?.values?.[0]?.value ||
        '';

      const suspicious = detectSuspiciousContent(errorContent);
      if (suspicious.isSuspicious) {
        event.tags = {
          ...event.tags,
          security_issue: 'true',
          attack_type: suspicious.reasons.join(',')
        };

        // Augmenter le niveau pour les attaques de sécurité
        event.level = 'fatal';
      }
    }

    return event;
  },

  // Ignorer certaines erreurs non critiques
  ignoreErrors: [
    // Erreurs réseau communes
    /Network Error/i,
    /ChunkLoadError/i,
    /Loading chunk \d+ failed/i,

    // Erreurs de navigateur tierces
    /Non-Error promise rejection captured/i,
    /ResizeObserver loop limit exceeded/i,

    // Erreurs d'extensions
    /Extension context invalidated/i,
    /The message port closed before a transfer/i,
  ],

  // Configuration des tags par défaut
  defaultTags: {
    platform: 'mon-toit',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    environment: import.meta.env.MODE || 'development'
  },

  // Configuration du contexte utilisateur
  initialScope: {
    tags: {
      component: 'app_initialization'
    }
  }
};

/**
 * Initialise Sentry avec la configuration améliorée
 */
export const initializeSentry = () => {
  // Ne pas initialiser Sentry en développement si non configuré
  if (!import.meta.env.PROD && !import.meta.env.VITE_SENTRY_DSN) {
    console.warn('Sentry non configuré pour le développement');
    return;
  }

  try {
    Sentry.init(SENTRY_CONFIG);
    console.log('Sentry initialisé avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de Sentry:', error);
  }
};

/**
 * Définit le contexte utilisateur pour Sentry
 */
export const setUserContext = (user: any) => {
  if (!user) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.full_name,
    user_type: user.user_type,
    // Ajouter des informations de rôle pour la sécurité
    role: user.user_type,
    is_admin: user.user_type === 'admin',
    is_verified: user.email_confirmed
  });

  // Mettre à jour le contexte global pour ErrorBoundary
  (window as any).__USER_CONTEXT__ = {
    id: user.id,
    email: user.email,
    user_type: user.user_type
  };
};

/**
 * Efface le contexte utilisateur
 */
export const clearUserContext = () => {
  Sentry.setUser(null);
  delete (window as any).__USER_CONTEXT__;
};

/**
 * Capture une erreur avec contexte enrichi
 */
export const captureError = (error: Error, context?: {
  component?: string;
  action?: string;
  userId?: string;
  additionalData?: Record<string, any>;
}) => {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setTag('component', context.component || 'unknown');
      scope.setTag('action', context.action || 'unknown');

      if (context.additionalData) {
        Object.entries(context.additionalData).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }
    }

    // Ajouter des informations de sécurité
    scope.setTag('timestamp', new Date().toISOString());
    scope.setTag('url', window.location.href);
    scope.setTag('user_agent', navigator.userAgent);

    Sentry.captureException(error);
  });
};

/**
 * Capture une erreur de sécurité spécifique
 */
export const captureSecurityError = (error: Error, securityContext: {
  attackType: string;
  source: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress?: string;
}) => {
  Sentry.withScope((scope) => {
    scope.setTag('security_incident', 'true');
    scope.setTag('attack_type', securityContext.attackType);
    scope.setTag('source', securityContext.source);
    scope.setTag('severity', securityContext.severity);

    if (securityContext.userId) {
      scope.setUser({ id: securityContext.userId });
    }

    scope.setExtra('security_context', securityContext);
    scope.setLevel('fatal'); // Les erreurs de sécurité sont toujours fatales

    Sentry.captureException(error);
  });
};

/**
 * Track les performances des actions utilisateur
 * Note: Requires @sentry/tracing for span tracking
 */
export const trackPerformance = (name: string, data?: Record<string, any>) => {
  // Basic tracking without spans - would need @sentry/tracing for full functionality
  Sentry.setExtra(`performance_${name}`, data || {});
  console.log(`Performance tracking: ${name}`, data);
};

/**
 * Track les erreurs de réseau avec contexte
 */
export const trackNetworkError = (error: Error, requestInfo: {
  url: string;
  method: string;
  status?: number;
  responseTime?: number;
}) => {
  Sentry.withScope((scope) => {
    scope.setTag('error_type', 'network');
    scope.setTag('request_method', requestInfo.method);
    scope.setTag('request_url', requestInfo.url);
    scope.setTag('request_status', requestInfo.status?.toString() || 'unknown');

    if (requestInfo.responseTime) {
      scope.setExtra('response_time_ms', requestInfo.responseTime);
    }

    scope.setExtra('request_info', {
      ...requestInfo,
      // Masquer les données sensibles
      url: requestInfo.url.replace(/\/[^\/]*$/, '/***')
    });

    Sentry.captureException(error);
  });
};

/**
 * Hook React pour le tracking des erreurs de composants
 */
export const useErrorTracking = (componentName: string) => {
  return React.useCallback((error: Error, errorInfo?: any) => {
    captureError(error, {
      component: componentName,
      action: 'component_error',
      additionalData: errorInfo
    });
  }, [componentName]);
};

/**
 * Crée un wrapper pour les fonctions asynchrones avec tracking
 */
export const withErrorTracking = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: { component: string; action: string }
): T => {
  return (async (...args: Parameters<T>) => {
    try {
      const result = await fn(...args);
      return result;
    } catch (error) {
      captureError(error as Error, {
        ...context,
        additionalData: { args: args.length }
      });
      throw error;
    }
  }) as T;
};


export default {
  initializeSentry,
  setUserContext,
  clearUserContext,
  captureError,
  captureSecurityError,
  trackPerformance,
  trackNetworkError,
  useErrorTracking,
  withErrorTracking
};