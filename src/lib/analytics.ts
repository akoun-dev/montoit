/**
 * Configuration Google Analytics 4
 */

import ReactGA from 'react-ga4';

let initialized = false;

/**
 * Initialiser Google Analytics
 */
export function initAnalytics() {
  // Ne pas initialiser en développement
  if (import.meta.env.DEV) {
    console.log('[Analytics] Skipped in development mode');
    return;
  }

  const measurementId = import.meta.env['VITE_GA_MEASUREMENT_ID'];

  if (!measurementId) {
    console.warn('[Analytics] Measurement ID not configured, tracking disabled');
    return;
  }

  try {
    ReactGA.initialize(measurementId, {
      gaOptions: {
        anonymizeIp: true,
      },
    });

    initialized = true;
    console.log('[Analytics] Initialized successfully');
  } catch (error) {
    console.error('[Analytics] Failed to initialize:', error);
  }
}

/**
 * Tracker une page vue
 */
export function trackPageView(path: string, title?: string) {
  if (!initialized) return;

  try {
    ReactGA.send({
      hitType: 'pageview',
      page: path,
      title: title || document.title,
    });
  } catch (error) {
    console.error('[Analytics] Failed to track page view:', error);
  }
}

/**
 * Tracker un événement
 */
export function trackEvent(category: string, action: string, label?: string, value?: number) {
  if (!initialized) return;

  try {
    ReactGA.event({
      category,
      action,
      label,
      value,
    });
  } catch (error) {
    console.error('[Analytics] Failed to track event:', error);
  }
}

/**
 * Tracker une conversion
 */
export function trackConversion(eventName: string, params?: Record<string, any>) {
  if (!initialized) return;

  try {
    ReactGA.gtag('event', eventName, params);
  } catch (error) {
    console.error('[Analytics] Failed to track conversion:', error);
  }
}

/**
 * Définir les propriétés utilisateur
 */
export function setUserProperties(properties: Record<string, any>) {
  if (!initialized) return;

  try {
    ReactGA.set(properties);
  } catch (error) {
    console.error('[Analytics] Failed to set user properties:', error);
  }
}

/**
 * Événements prédéfinis pour Mon Toit
 */
export const AnalyticsEvents = {
  // Authentification
  SIGNUP_STARTED: 'signup_started',
  SIGNUP_COMPLETED: 'signup_completed',
  LOGIN_COMPLETED: 'login_completed',

  // Propriétés
  PROPERTY_VIEWED: 'property_viewed',
  PROPERTY_SEARCH: 'property_search',
  PROPERTY_FAVORITED: 'property_favorited',

  // Contrats
  CONTRACT_CREATED: 'contract_created',
  CONTRACT_SIGNED: 'contract_signed',

  // Paiements
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_COMPLETED: 'payment_completed',

  // Vérification
  VERIFICATION_STARTED: 'verification_started',
  VERIFICATION_COMPLETED: 'verification_completed',

  // Messagerie
  MESSAGE_SENT: 'message_sent',
  CONVERSATION_STARTED: 'conversation_started',
} as const;

/**
 * Hook React pour tracker les pages automatiquement
 */
export function usePageTracking() {
  // Sera utilisé dans App.tsx avec useLocation
  return { trackPageView };
}
