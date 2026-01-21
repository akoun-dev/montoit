import { logger } from './logger';

interface FetchOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
}

interface FetchResponse<T = unknown> {
  data: T | null;
  error: Error | null;
  status: number;
}

export async function fetchWithRetry<T = unknown>(
  url: string,
  options: FetchOptions = {}
): Promise<FetchResponse<T>> {
  const { retries = 3, retryDelay = 1000, timeout = 10000, ...fetchOptions } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return {
        data: data as T,
        error: null,
        status: response.status,
      };
    } catch (error) {
      lastError = error as Error;

      if (attempt < retries) {
        logger.warn(`Fetch attempt ${attempt + 1} failed, retrying...`, {
          url,
          error: lastError.message,
        });

        await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
  }

  logger.error('Fetch failed after all retries', lastError!, { url, retries });

  return {
    data: null,
    error: lastError,
    status: 0,
  };
}

export async function fetchJSON<T = unknown>(
  url: string,
  options?: FetchOptions
): Promise<FetchResponse<T>> {
  return fetchWithRetry<T>(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
}

export async function postJSON<T = unknown>(
  url: string,
  data: unknown,
  options?: FetchOptions
): Promise<FetchResponse<T>> {
  return fetchWithRetry<T>(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify(data),
  });
}
