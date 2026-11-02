/**
 * Service pour la gestion améliorée des erreurs
 *
 * Ce service fournit des fonctions pour traiter les erreurs de manière
 * plus informative et user-friendly.
 */

export interface ErrorDetails {
  code?: string;
  message: string;
  userMessage: string;
  technical?: string;
  field?: string;
  isAuthError?: boolean;
  isPermissionError?: boolean;
  isValidationError?: boolean;
}

type GenericError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

/**
 * Map des codes d'erreur Supabase vers des messages utilisateur
 */
const SUPABASE_ERROR_MAP: Record<string, Omit<ErrorDetails, 'code' | 'message'>> = {
  // Auth errors
  PGRST301: {
    userMessage: 'Votre session a expiré. Veuillez vous reconnecter.',
    isAuthError: true,
  },
  'JWT expired': {
    userMessage: 'Votre session a expiré. Veuillez vous reconnecter.',
    isAuthError: true,
  },
  'invalid claim': {
    userMessage: 'Données de session invalides. Veuillez vous reconnecter.',
    isAuthError: true,
  },

  // Permission errors
  '42501': {
    userMessage: "Permission refusée. Vous n'avez pas les droits nécessaires.",
    isPermissionError: true,
  },
  insufficient_privilege: {
    userMessage: "Permission refusée. Vous n'avez pas les droits nécessaires.",
    isPermissionError: true,
  },

  // Not found errors
  PGRST116: {
    userMessage: 'Ressource non trouvée.',
    isValidationError: true,
  },
  '42P01': {
    userMessage: 'Table ou vue introuvable. Veuillez contacter le support.',
    isValidationError: true,
  },

  // Validation errors
  '23505': {
    userMessage: 'Cette donnée existe déjà. Vérifiez les doublons.',
    isValidationError: true,
  },
  '23514': {
    userMessage: 'Données invalides. Veuillez vérifier tous les champs.',
    isValidationError: true,
  },
  '23502': {
    userMessage: 'Certains champs obligatoires sont manquants.',
    isValidationError: true,
  },
  '23503': {
    userMessage: 'Référence invalide. Veuillez vérifier les données liées.',
    isValidationError: true,
  },

  // Constraint errors
  '22001': {
    userMessage: 'Texte trop long. Veuillez raccourcir votre saisie.',
    isValidationError: true,
  },
  '22003': {
    userMessage: 'Valeur numérique trop grande.',
    isValidationError: true,
  },

  // Database errors
  '08006': {
    userMessage: 'Erreur de connexion à la base de données. Veuillez réessayer.',
    isValidationError: true,
  },
  '08001': {
    userMessage: 'Impossible de se connecter à la base de données.',
    isValidationError: true,
  },

  // RLS errors
  PGRST204: {
    userMessage: 'Colonne ou table non autorisée.',
    isPermissionError: true,
  },
};

/**
 * Gère les erreurs de manière améliorée
 * @param error - L'erreur originale
 * @param context - Contexte supplémentaire pour l'erreur
 * @returns Objet ErrorDetails avec message utilisateur
 */
export const handleError = (error: GenericError | unknown, context?: string): ErrorDetails => {
  const err = error as GenericError;
  const errorString = err?.message || '';
  const errorCode = err?.code;

  // Rechercher une correspondance dans le map d'erreurs
  let mappedError =
    (errorCode && SUPABASE_ERROR_MAP[errorCode]) ||
    Object.entries(SUPABASE_ERROR_MAP).find(([key]) =>
      errorString.toLowerCase().includes(key.toLowerCase())
    )?.[1];

  if (!mappedError) {
    // Erreur générique
    mappedError = {
      userMessage: context
        ? `Une erreur est survenue lors de ${context}. Veuillez réessayer.`
        : 'Une erreur est survenue. Veuillez réessayer.',
    };
  }

  // Essayer d'extraire le nom du champ depuis le message d'erreur
  const fieldMatch = errorString.match(/column "(.+?)"|field "(.+?)"/i);
  const field = fieldMatch?.[1] || fieldMatch?.[2];

  return {
    code: errorCode,
    message: errorString,
    userMessage: mappedError.userMessage,
    technical: err?.details || err?.hint,
    field,
    isAuthError: mappedError.isAuthError || false,
    isPermissionError: mappedError.isPermissionError || false,
    isValidationError: mappedError.isValidationError || false,
  };
};

/**
 * Affiche une erreur à l'utilisateur
 * @param error - L'erreur à afficher
 * @param context - Contexte de l'erreur
 */
export const displayError = (error: GenericError | unknown, context?: string): void => {
  const errorDetails = handleError(error, context);

  // Pour le développement, logger les détails complets
  if (process.env['NODE_ENV'] === 'development') {
    console.error('Error details:', errorDetails);
    console.error('Original error:', error);
  }

  // Afficher une notification toast (à implémenter avec votre système de notifications)
  // Exemple: toast.error(errorDetails.userMessage);

  // Pour l'instant, utiliser alert en fallback
  if (errorDetails.isAuthError) {
    alert(`Session expirée: ${errorDetails.userMessage}`);
    // Rediriger vers la page de connexion
    window.location.href = '/auth/login';
  } else if (errorDetails.isPermissionError) {
    alert(`Permission refusée: ${errorDetails.userMessage}`);
  } else {
    alert(`Erreur: ${errorDetails.userMessage}`);
  }
};

/**
 * Wrapper pour les appels API avec gestion d'erreur
 * @param apiCall - La fonction API à appeler
 * @param context - Contexte de l'appel
 * @returns Promise avec le résultat ou lance une erreur
 */
export const withErrorHandling = async <T>(
  apiCall: () => Promise<T>,
  context?: string
): Promise<T> => {
  try {
    return await apiCall();
  } catch (error: unknown) {
    const errorDetails = handleError(error, context);

    // Logger pour le débogage
    console.error(`API Error in ${context}:`, {
      details: errorDetails,
      original: error,
    });

    // Relancer avec les détails enrichis
    throw new Error(errorDetails.userMessage);
  }
};

/**
 * Type guard pour vérifier si une erreur est une erreur de permission
 */
export const isPermissionError = (error: GenericError | unknown): boolean => {
  const errorDetails = handleError(error);
  return errorDetails.isPermissionError ?? false;
};

/**
 * Type guard pour vérifier si une erreur est une erreur d'authentification
 */
export const isAuthError = (error: GenericError | unknown): boolean => {
  const errorDetails = handleError(error);
  return errorDetails.isAuthError ?? false;
};

/**
 * Type guard pour vérifier si une erreur est une erreur de validation
 */
export const isValidationError = (error: GenericError | unknown): boolean => {
  const errorDetails = handleError(error);
  return errorDetails.isValidationError ?? false;
};
