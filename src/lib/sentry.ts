/**
 * Configuration Sentry pour le monitoring d'erreurs
 */

import * as Sentry from '@sentry/react';

/**
 * Initialiser Sentry
 *
 * À appeler au démarrage de l'application
 */
export function initSentry() {
  // Ne pas initialiser en développement
  if (import.meta.env.DEV) {
    console.log('[Sentry] Skipped in development mode');
    return;
  }

  const dsn = import.meta.env['VITE_SENTRY_DSN'];

  if (!dsn) {
    console.warn('[Sentry] DSN not configured, monitoring disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env['VITE_ENVIRONMENT'] || 'production',

    // Performance Monitoring
    tracesSampleRate: 0.1, // 10% des transactions

    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% des sessions normales
    replaysOnErrorSampleRate: 1.0, // 100% des sessions avec erreurs

    // Filtrer les erreurs
    beforeSend(event, hint) {
      // Ignorer les erreurs de développement
      if (event.exception) {
        const error = hint.originalException;

        // Ignorer les erreurs réseau temporaires
        if (error && typeof error === 'object' && 'message' in error) {
          const message = String(error.message).toLowerCase();
          if (
            message.includes('network') ||
            message.includes('fetch') ||
            message.includes('timeout')
          ) {
            return null;
          }
        }
      }

      return event;
    },

    // Ignorer certaines URLs
    ignoreErrors: [
      // Erreurs du navigateur
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',

      // Erreurs d'extensions navigateur
      'chrome-extension://',
      'moz-extension://',
    ],
  });

  console.log('[Sentry] Initialized successfully');
}

/**
 * Capturer une erreur manuellement
 */
export function captureError(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.setContext('custom', context);
  }
  Sentry.captureException(error);
}

/**
 * Capturer un message
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

/**
 * Définir l'utilisateur courant
 */
export function setUser(user: { id: string; email?: string; username?: string }) {
  Sentry.setUser(user);
}

/**
 * Nettoyer l'utilisateur
 */
export function clearUser() {
  Sentry.setUser(null);
}

/**
 * Ajouter un breadcrumb (fil d'Ariane)
 */
export function addBreadcrumb(message: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    data,
    level: 'info',
  });
}
