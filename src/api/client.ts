/**
 * API Client
 * Centralized Supabase client configuration and helper functions
 */

import { supabase } from '@/integrations/supabase/client';
import type { PostgrestError } from '@supabase/supabase-js';
import { logger } from '@/shared/lib/logger';
import { isLocalSupabase } from '@/shared/utils/environment';

export interface ApiResponse<T> {
  data: T | null;
  error: PostgrestError | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number | null;
  error: PostgrestError | null;
}

/**
 * Helper to handle Supabase query responses with consistent error handling
 */
export async function handleQuery<T>(
  queryPromise: PromiseLike<{ data: T | null; error: PostgrestError | null }>
): Promise<ApiResponse<T>> {
  try {
    const { data, error } = await queryPromise;

    if (error) {
      logger.error('API query error', undefined, { error });
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    logger.error('Unexpected API error', error as Error);
    return {
      data: null,
      error: {
        name: 'UnknownError',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack || '' : String(error),
        hint: '',
        code: 'UNKNOWN_ERROR',
      },
    };
  }
}

/**
 * Helper to handle paginated queries
 */
export async function handlePaginatedQuery<T>(
  queryBuilder: ReturnType<typeof supabase.from>,
  page: number = 1,
  pageSize: number = 12
): Promise<PaginatedResponse<T>> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    const { data, error, count } = await queryBuilder.range(from, to);

    if (error) {
      logger.error('Paginated query error', undefined, { error });
      return { data: [], count: null, error };
    }

    return { data: data as T[], count, error: null };
  } catch (error) {
    logger.error('Unexpected paginated query error', error as Error);
    return {
      data: [],
      count: null,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : String(error),
        hint: '',
        code: 'UNKNOWN_ERROR',
      } as PostgrestError,
    };
  }
}

/**
 * Helper to handle file uploads to Supabase Storage
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<{ data: { path: string } | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (error) {
      console.error('Upload error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Unexpected upload error:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown upload error'),
    };
  }
}

/**
 * Helper to get public URL for a file in Storage
 */
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Helper to delete a file from Storage
 */
export async function deleteFile(bucket: string, path: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      console.error('Delete error:', error);
      return { error };
    }

    return { error: null };
  } catch (error) {
    console.error('Unexpected delete error:', error);
    return {
      error: error instanceof Error ? error : new Error('Unknown delete error'),
    };
  }
}

/**
 * Helper to call Edge Functions with retry logic and better error handling
 */
export async function callEdgeFunction<TResponse = unknown>(
  functionName: string,
  body: Record<string, unknown>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    timeout?: number;
  } = {}
): Promise<{ data: TResponse | null; error: Error | null }> {
  // Si Supabase est local, on simule une réponse réussie pour éviter les erreurs 503
  if (isLocalSupabase()) {
    console.warn(`Edge Function "${functionName}" appelée en local, simulation de succès.`);
    // Retourner une réponse simulée selon le type de fonction
    if (functionName === 'send-email') {
      // Pour l'envoi d'email, on simule un succès
      return { data: { success: true, message: 'Email simulé (local)' } as TResponse, error: null };
    }
    // Pour d'autres fonctions, on retourne un objet générique
    return { data: { success: true } as TResponse, error: null };
  }

  const { maxRetries = 2, retryDelay = 1000, timeout = 25000 } = options;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const { data, error } = (await supabase.functions.invoke(functionName, {
        body,
        signal: controller.signal,
      })) as { data: TResponse | null; error: Error | null };

      clearTimeout(timeoutId);

      // Check for specific error types
      if (error) {
        // Don't retry on authentication errors
        if (error.message?.includes('401') || error.message?.includes('403')) {
          console.error('Edge Function auth error:', error);
          return { data: null, error };
        }

        // Retry on timeout or server errors
        if (
          error.message?.includes('504') ||
          error.message?.includes('timeout') ||
          error.message?.includes('502')
        ) {
          console.warn(`Edge Function timeout (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
          lastError = error;

          if (attempt < maxRetries) {
            // Wait before retrying with exponential backoff
            await new Promise((resolve) => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
            continue;
          }
        }

        console.error('Edge Function error:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error: unknown) {
      // Handle AbortError (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`Edge Function timeout (attempt ${attempt + 1}/${maxRetries + 1})`);
        lastError = new Error(`La fonction a mis trop de temps à répondre (${timeout}ms)`);

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
          continue;
        }
      } else {
        console.error('Unexpected Edge Function error:', error);
        lastError = error instanceof Error ? error : new Error('Unknown function error');
      }
    }
  }

  return { data: null, error: lastError };
}

export { supabase };
