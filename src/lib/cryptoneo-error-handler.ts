import { logger } from '@/services/logger';

interface ErrorHandling {
  userMessage: string;
  action: 'regenerate_certificate' | 'redirect_verification' | 'async_verification' | 'fallback_simple_signature' | 'log_and_notify_admin' | 'retry';
  redirectUrl?: string;
  fallback?: string;
  retryIn?: number;
  notification?: boolean;
}

export const handleCryptoNeoError = (error: any): ErrorHandling => {
  // Extract error code
  const errorCode = error?.code || error?.error?.code || 'UNKNOWN';

  switch (errorCode) {
    case 'CERTIFICATE_EXPIRED':
      return {
        userMessage: 'Votre certificat numérique a expiré. Un nouveau certificat sera généré automatiquement.',
        action: 'regenerate_certificate',
        fallback: 'use_simple_signature'
      };

    case 'ONECI_DATA_MISSING':
    case 'ONECI_NOT_VERIFIED':
      return {
        userMessage: 'Vérification ONECI incomplète. Veuillez compléter votre vérification d\'identité.',
        action: 'redirect_verification',
        redirectUrl: '/verification'
      };

    case 'PHOTO_MISSING':
      return {
        userMessage: 'Photo ONECI manquante. Veuillez compléter votre vérification d\'identité avec photo.',
        action: 'redirect_verification',
        redirectUrl: '/verification'
      };

    case 'API_TIMEOUT':
    case 'TIMEOUT':
      return {
        userMessage: 'Le traitement prend plus de temps que prévu. Vous serez notifié une fois terminé.',
        action: 'async_verification',
        notification: true
      };

    case 'API_UNAVAILABLE':
    case 'SERVICE_UNAVAILABLE':
    case 503:
      return {
        userMessage: 'Service de signature électronique temporairement indisponible. Veuillez réessayer dans quelques minutes.',
        action: 'fallback_simple_signature',
        retryIn: 300 // 5 minutes
      };

    case 'INVALID_CREDENTIALS':
    case 401:
    case 403:
      return {
        userMessage: 'Erreur de configuration du service de signature. L\'équipe technique a été notifiée.',
        action: 'log_and_notify_admin',
        fallback: 'use_simple_signature'
      };

    case 'CERTIFICATE_INVALID':
      return {
        userMessage: 'Certificat invalide. Un nouveau certificat sera généré.',
        action: 'regenerate_certificate'
      };

    case 'PDF_GENERATION_FAILED':
      return {
        userMessage: 'Le document PDF doit être généré avant la signature électronique.',
        action: 'fallback_simple_signature'
      };

    case 'SIGNATURES_INCOMPLETE':
      return {
        userMessage: 'Les deux parties doivent d\'abord signer avec signature simple.',
        action: 'fallback_simple_signature'
      };

    case 'NETWORK_ERROR':
      return {
        userMessage: 'Erreur de connexion. Veuillez vérifier votre connexion Internet.',
        action: 'retry',
        retryIn: 5 // 5 seconds
      };

    default:
      logger.error('Unhandled CryptoNeo error', { 
        error, 
        errorCode: error?.code || 'UNKNOWN',
        context: 'cryptoneo-error-handler' 
      });
      return {
        userMessage: 'Une erreur inattendue s\'est produite. Vous pouvez continuer avec la signature simple.',
        action: 'log_and_notify_admin',
        fallback: 'use_simple_signature'
      };
  }
};

export const shouldFallbackToSimpleSignature = (errorCode: string): boolean => {
  const fallbackCodes = [
    'API_UNAVAILABLE',
    'SERVICE_UNAVAILABLE',
    'INVALID_CREDENTIALS',
    'PDF_GENERATION_FAILED',
    'SIGNATURES_INCOMPLETE'
  ];
  return fallbackCodes.includes(errorCode);
};
