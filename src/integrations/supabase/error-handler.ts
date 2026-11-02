/**
 * Utility functions for handling Supabase errors
 */

export interface SupabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

/**
 * Check if error is related to JWT token issues
 */
export const isJWTError = (error: any): boolean => {
  if (!error) return false;

  const errorMessage = error?.message || error?.error_description || '';
  const errorCode = error?.code || '';

  return (
    errorMessage.includes('JWT') ||
    errorMessage.includes('Invalid token') ||
    errorMessage.includes('Expected 3 parts in JWT') ||
    errorCode === 'invalid_token' ||
    errorCode === 'token_expired' ||
    errorMessage.includes('Unauthorized') ||
    errorMessage.includes('401')
  );
};

/**
 * Handle Supabase API errors with proper cleanup for JWT issues
 */
export const handleSupabaseError = (error: any, context?: string): SupabaseError => {
  const baseError: SupabaseError = {
    message: error?.message || 'Une erreur est survenue',
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
  };

  // If it's a JWT error, clean up and provide a user-friendly message
  if (isJWTError(error)) {
    // Clean invalid tokens
    try {
      const keysToRemove = [
        'supabase.auth.token',
        'supabase.auth.refreshToken',
        'supabase.auth.expiresAt',
      ];
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (cleanupError) {
      console.warn('Could not clean auth tokens:', cleanupError);
    }

    return {
      ...baseError,
      message: 'Votre session a expiré. Veuillez vous reconnecter.',
      code: 'SESSION_EXPIRED',
    };
  }

  // Add context to error message if provided
  if (context) {
    baseError.message = `${context}: ${baseError.message}`;
  }

  return baseError;
};

/**
 * Wrapper for async functions to handle Supabase errors
 */
export const withErrorHandling = async <T>(
  asyncFn: () => Promise<T>,
  context?: string
): Promise<{ data: T | null; error: SupabaseError | null }> => {
  try {
    const result = await asyncFn();
    return { data: result, error: null };
  } catch (error: any) {
    const handledError = handleSupabaseError(error, context);
    return { data: null, error: handledError };
  }
};

/**
 * Check if user needs to re-authenticate
 */
export const needsReauth = (error: any): boolean => {
  return isJWTError(error);
};
