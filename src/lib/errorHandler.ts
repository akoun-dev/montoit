import { toast } from '@/hooks/use-toast';
import { logger } from '@/services/logger';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/constants';

/**
 * Custom application error class with typed error codes
 */
export class AppError extends Error {
  constructor(
    public code: keyof typeof ERROR_MESSAGES,
    public context?: Record<string, any>
  ) {
    super(ERROR_MESSAGES[code]);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Type guard for Supabase/Postgres errors
 */
export const isSupabaseError = (error: any): boolean => {
  return error && (
    error.code || 
    error.message?.includes('PostgrestError') ||
    error.message?.includes('FunctionsHttpError')
  );
};

/**
 * Centralized error handler
 * Logs error and displays user-friendly toast
 */
export const handleError = (
  error: unknown,
  fallbackMessage?: string
): void => {
  // Log the error with full context
  logger.logError(error, { 
    fallback: fallbackMessage,
    timestamp: new Date().toISOString(),
  });

  // Determine user-facing message
  let userMessage = fallbackMessage || ERROR_MESSAGES.SERVER_ERROR;

  if (error instanceof AppError) {
    userMessage = error.message;
  } else if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes('auth')) {
      userMessage = ERROR_MESSAGES.AUTH_REQUIRED;
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      userMessage = ERROR_MESSAGES.NETWORK_ERROR;
    } else if (isSupabaseError(error)) {
      // Parse Supabase error codes
      const err = error as any;
      if (err.code === '23505') {
        userMessage = 'Cette ressource existe déjà';
      } else if (err.code === '23503') {
        userMessage = 'Ressource liée introuvable';
      } else if (err.code === 'PGRST116') {
        userMessage = ERROR_MESSAGES.NOT_FOUND;
      }
    }
  }

  // Display error toast
  toast({
    title: "Erreur",
    description: userMessage,
    variant: "destructive",
  });
};

/**
 * Centralized success handler
 * Displays success toast with consistent styling
 */
export const handleSuccess = (
  code: keyof typeof SUCCESS_MESSAGES,
  description?: string
): void => {
  const message = description || SUCCESS_MESSAGES[code];

  toast({
    title: "Succès",
    description: message,
  });

  logger.info(`Success: ${code}`, { message });
};

/**
 * Handle async operations with error handling
 * Usage: await withErrorHandling(async () => { ... })
 */
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  errorMessage?: string
): Promise<T | null> => {
  try {
    return await operation();
  } catch (error) {
    handleError(error, errorMessage);
    return null;
  }
};
