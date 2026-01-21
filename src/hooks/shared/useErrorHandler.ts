import { useState, useCallback } from 'react';

// Types pour la gestion d'erreur
export interface ErrorInfo {
  message: string;
  code?: string;
  details?: any;
  timestamp: Date;
}

export interface ErrorState {
  hasError: boolean;
  error: ErrorInfo | null;
}

// Hook personnalisé pour la gestion d'erreur
export const useErrorHandler = () => {
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    error: null,
  });

  // Fonction pour gérer les erreurs
  const handleError = useCallback((error: any, context?: string) => {
    const errorInfo: ErrorInfo = {
      message: error?.message || "Une erreur inattendue s'est produite",
      code: error?.code,
      details: error?.details || error,
      timestamp: new Date(),
    };

    console.error(`Erreur${context ? ` (${context})` : ''}:`, errorInfo);

    setErrorState({
      hasError: true,
      error: errorInfo,
    });

    // Optionnel : Envoyer l'erreur à un service de monitoring
    // sendErrorToMonitoring(errorInfo, context);

    return errorInfo;
  }, []);

  // Fonction pour effacer l'erreur
  const clearError = useCallback(() => {
    setErrorState({
      hasError: false,
      error: null,
    });
  }, []);

  // Fonction pour gérer les promises avec gestion d'erreur
  const withErrorHandling = useCallback(
    <T>(promise: Promise<T>, context?: string): Promise<T | null> => {
      return promise.catch((error) => {
        handleError(error, context);
        return null;
      });
    },
    [handleError]
  );

  // Fonction pour exécuter une fonction avec gestion d'erreur
  const withErrorBoundary = useCallback(
    async <T>(fn: () => T | Promise<T>, context?: string): Promise<T | null> => {
      try {
        const result = fn();
        if (result instanceof Promise) {
          return await result;
        }
        return result;
      } catch (error) {
        handleError(error, context);
        return null;
      }
    },
    [handleError]
  );

  return {
    error: errorState.error,
    hasError: errorState.hasError,
    handleError,
    clearError,
    withErrorHandling,
    withErrorBoundary,
  };
};

// Utilitaires pour différents types d'erreurs
export class AppError extends Error {
  public code?: string;
  public details?: any;

  constructor(message: string, code?: string, details?: any) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

// Erreurs prédéfinies
export const ErrorTypes = {
  NETWORK: 'NETWORK_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR',
} as const;

export type ErrorType = (typeof ErrorTypes)[keyof typeof ErrorTypes];

// Créateur d'erreurs prédéfinies
export const createError = (type: ErrorType, message: string, details?: any): AppError => {
  return new AppError(message, type, details);
};

// Erreurs communes
export const CommonErrors = {
  network: (details?: any) =>
    createError(
      ErrorTypes.NETWORK,
      'Erreur de connexion réseau. Veuillez vérifier votre connexion internet.',
      details
    ),

  validation: (message: string, details?: any) =>
    createError(ErrorTypes.VALIDATION, message, details),

  notFound: (resource: string, details?: any) =>
    createError(ErrorTypes.NOT_FOUND, `${resource} non trouvé(e).`, details),

  server: (details?: any) =>
    createError(ErrorTypes.SERVER_ERROR, 'Erreur serveur. Veuillez réessayer plus tard.', details),

  unknown: (details?: any) =>
    createError(ErrorTypes.UNKNOWN, "Une erreur inconnue s'est produite.", details),
};

export default useErrorHandler;
