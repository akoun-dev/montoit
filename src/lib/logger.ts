/**
 * Logger intelligent qui masque les logs en production
 * et affiche des messages utilisateur-friendly
 */

const IS_PRODUCTION = import.meta.env.PROD;
const IS_DEVELOPMENT = import.meta.env.DEV;

/**
 * Logger de développement (visible uniquement en dev)
 */
export const devLog = {
  log: (...args: unknown[]) => {
    if (IS_DEVELOPMENT) {
      console.log('[DEV]', ...args);
    }
  },

  warn: (...args: unknown[]) => {
    if (IS_DEVELOPMENT) {
      console.warn('[DEV]', ...args);
    }
  },

  error: (...args: unknown[]) => {
    if (IS_DEVELOPMENT) {
      console.error('[DEV]', ...args);
    }
  },

  info: (...args: unknown[]) => {
    if (IS_DEVELOPMENT) {
      console.info('[DEV]', ...args);
    }
  },
};

/**
 * Logger de production (toujours visible mais formaté)
 */
export const prodLog = {
  log: (...args: unknown[]) => {
    console.log('[Mon Toit]', ...args);
  },

  warn: (...args: unknown[]) => {
    console.warn('[Mon Toit]', ...args);
  },
  
  error: (error: Error | string, context?: string) => {
    if (IS_PRODUCTION) {
      // En production, log simple sans stack trace
      console.error('[Mon Toit]', context || 'Erreur', typeof error === 'string' ? error : error.message);
    } else {
      // En dev, log complet
      console.error('[Mon Toit]', context || 'Erreur', error);
    }
  },
};

/**
 * Messages d'erreur utilisateur-friendly
 */
export const userMessages = {
  networkError: "Impossible de se connecter. Vérifiez votre connexion internet.",
  loadError: "Erreur de chargement. Veuillez réessayer.",
  authError: "Erreur d'authentification. Veuillez vous reconnecter.",
  notFound: "Élément introuvable.",
  serverError: "Erreur serveur. Nous travaillons à résoudre le problème.",
  validationError: "Veuillez vérifier les informations saisies.",
  permissionError: "Vous n'avez pas les permissions nécessaires.",
  unknownError: "Une erreur inattendue s'est produite.",
};

/**
 * Convertit une erreur technique en message utilisateur
 */
export const getErrorMessage = (error: Error | string | unknown): string => {
  if (!error) return userMessages.unknownError;
  
  const errorMessage = typeof error === 'string' ? error : error.message || '';
  
  // Network errors
  if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
    return userMessages.networkError;
  }
  
  // Auth errors
  if (errorMessage.includes('auth') || errorMessage.includes('unauthorized')) {
    return userMessages.authError;
  }
  
  // Not found
  if (errorMessage.includes('404') || errorMessage.includes('not found')) {
    return userMessages.notFound;
  }
  
  // Server errors
  if (errorMessage.includes('500') || errorMessage.includes('server')) {
    return userMessages.serverError;
  }
  
  // Validation errors
  if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    return userMessages.validationError;
  }
  
  // Permission errors
  if (errorMessage.includes('permission') || errorMessage.includes('forbidden')) {
    return userMessages.permissionError;
  }
  
  // Default
  return IS_PRODUCTION ? userMessages.unknownError : errorMessage;
};

/**
 * Logger principal (utilise devLog ou prodLog selon l'environnement)
 */
export const logger = IS_DEVELOPMENT ? devLog : prodLog;

/**
 * Performance logger (uniquement en dev)
 */
export const perfLog = {
  start: (label: string) => {
    if (IS_DEVELOPMENT) {
      console.time(`[PERF] ${label}`);
    }
  },
  
  end: (label: string) => {
    if (IS_DEVELOPMENT) {
      console.timeEnd(`[PERF] ${label}`);
    }
  },
};

