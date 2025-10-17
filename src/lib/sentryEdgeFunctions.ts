/**
 * Sentry monitoring wrapper for Supabase Edge Functions
 * Provides performance tracking and error capture for edge function calls
 */

import * as Sentry from "@sentry/react";

/**
 * Wraps an edge function call with Sentry monitoring
 * @param functionName - Name of the edge function being called
 * @param params - Parameters passed to the function
 * @param callback - The actual edge function invocation
 * @returns Result from the edge function
 */
export const trackEdgeFunctionCall = async <T>(
  functionName: string,
  params: unknown,
  callback: () => Promise<T>
): Promise<T> => {
  if (!import.meta.env.PROD) {
    // In development, just execute without tracking
    return callback();
  }

  const transaction = Sentry.startSpan({
    op: 'edge_function',
    name: functionName,
  }, async (span) => {
    try {
      const result = await callback();
      span?.setStatus({ code: 1 }); // OK status
      return result;
    } catch (error) {
      span?.setStatus({ code: 2 }); // Error status
      
      Sentry.captureException(error, {
        tags: { 
          edgeFunction: functionName,
          errorType: 'edge_function_error',
        },
        extra: { 
          params,
          functionName,
        },
        level: 'error',
      });
      
      throw error;
    }
  });

  return transaction;
};

/**
 * Example usage:
 * 
 * const { data } = await trackEdgeFunctionCall(
 *   'generate-report',
 *   { owner_id: '123', period: 'monthly' },
 *   () => supabase.functions.invoke('generate-report', { 
 *     body: { owner_id: '123', period: 'monthly' } 
 *   })
 * );
 */
