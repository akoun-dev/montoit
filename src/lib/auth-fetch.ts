/**
 * Authenticated fetch wrapper for API calls that require a valid session.
 *
 * - Automatically includes credentials (cookies) with every request
 * - On 401, attempts ONE re-validation via checkAuth()
 * - If re-validation also fails, then logs the user out
 * - On 5xx errors, does NOT log out (server might be temporarily down)
 * - Returns parsed JSON on success
 * - In-memory response cache for GET requests with stale-while-revalidate support
 * - Auto-invalidates cache on mutations (POST, PATCH, PUT, DELETE)
 * - In Capacitor mode, prefixes relative URLs and adds Bearer token
 */

import { useAuthStore } from '@/lib/auth-store'
import { getApiBaseUrl, getAuthToken, isCapacitor } from '@/lib/capacitor'
import {
  getCacheKey,
  getCachedData,
  setCachedData,
  getTtlForUrl,
  autoInvalidateOnMutation,
  getLastMutationAt,
} from '@/lib/response-cache'

export class AuthError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'AuthError'
  }
}

// ── Background revalidation stale-while-revalidate helper ───────────────────

/**
 * Silently fetches fresh data and updates the cache.
 */
async function revalidateInBackground<T>(url: string, cacheKey: string): Promise<void> {
  try {
    const baseUrl = getApiBaseUrl()
    let effectiveUrl = url
    if (baseUrl && effectiveUrl.startsWith('/')) {
      effectiveUrl = `${baseUrl.replace(/\/+$/, '')}${effectiveUrl}`
    }
    const headers: Record<string, string> = {}
    if (isCapacitor()) {
      const token = await getAuthToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }
    const res = await fetch(effectiveUrl, { headers, credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      const { ttl, staleWhileRevalidate } = getTtlForUrl(url)
      setCachedData(cacheKey, data, ttl, staleWhileRevalidate)
    }
  } catch {
    // Silently ignore revalidation errors — stale data remains available
  }
}

/**
 * Fetch wrapper that ensures cookies are sent and handles 401 gracefully.
 * Returns parsed JSON on success, throws AuthError on auth/server failure.
 * Supports stale-while-revalidate caching for GET requests.
 */
export async function authFetch<T = Record<string, unknown>>(
  url: string,
  options?: RequestInit & { cacheTtl?: number; skipCache?: boolean; timeout?: number }
): Promise<T> {
  // Check cache for GET requests (unless skipCache is set or cacheTtl is 0)
  const cacheKey = getCacheKey(url, options?.method)
  const customOptions = options as RequestInit & { skipCache?: boolean; cacheTtl?: number; timeout?: number }
  let shouldSkipCache = customOptions?.skipCache || customOptions?.cacheTtl === 0

  // If a mutation happened less than 2s ago, skip cache to guarantee fresh data
  if (cacheKey && !shouldSkipCache) {
    const sinceLastMutation = Date.now() - getLastMutationAt()
    if (sinceLastMutation < 2_000) {
      shouldSkipCache = true
    }
  }

  if (cacheKey && !shouldSkipCache) {
    const cached = getCachedData<T>(cacheKey)
    if (cached) {
      // If data is stale but still in grace period, trigger background revalidation
      if (cached.isStale) {
        // Fire and forget revalidation — don't await
        revalidateInBackground(url, cacheKey)
      }
      return cached.data
    }
  }

  // Support timeout via AbortController
  const timeoutMs = customOptions?.timeout
  let abortController: AbortController | null = null
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  if (timeoutMs && timeoutMs > 0) {
    const controller = new AbortController()
    abortController = controller
    timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  }

  // In Capacitor mode, prefix relative URLs and add auth token
  let effectiveUrl = url
  const baseUrl = getApiBaseUrl()
  const headers: Record<string, string> = { ...((options?.headers as Record<string, string>) || {}) }

  if (baseUrl && effectiveUrl.startsWith('/')) {
    effectiveUrl = `${baseUrl.replace(/\/+$/, '')}${effectiveUrl}`
  }
  if (isCapacitor()) {
    const token = await getAuthToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  let res: Response
  try {
    res = await fetch(effectiveUrl, {
      ...options,
      headers,
      signal: abortController?.signal,
      credentials: 'include',
    })
  } catch (e) {
    if (timeoutId) clearTimeout(timeoutId)
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new AuthError(408, 'La requête a pris trop de temps. Veuillez réessayer.')
    }
    throw e
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }

  // ─── 5xx Server Error → don't logout, just throw ────────────────────────
  if (res.status >= 500) {
    throw new AuthError(res.status, 'Erreur serveur. Veuillez réessayer.')
  }

  // ─── 401 Unauthorized → try to re-validate session once ─────────────────
  if (res.status === 401) {
    const { checkAuth, logout, isAuthenticated } = useAuthStore.getState()

    if (isAuthenticated) {
      try {
        await checkAuth()
        const newState = useAuthStore.getState()
        if (newState.isAuthenticated) {
          // Re-auth succeeded — retry the original request ONCE
          const retryRes = await fetch(effectiveUrl, { ...options, headers, credentials: 'include' })
          if (retryRes.ok) {
            const data = await retryRes.json() as T
            // Cache the successful retry response
            if (cacheKey) {
              const { ttl, staleWhileRevalidate } = getTtlForUrl(url)
              setCachedData(cacheKey, data, ttl, staleWhileRevalidate)
            }
            return data
          }
          if (retryRes.status === 401) {
            // Still 401 after re-auth — session is truly invalid
            await logout()
            throw new AuthError(401, 'Session expirée. Veuillez vous reconnecter.')
          }
          // Other error on retry
          throw new AuthError(retryRes.status, `Erreur ${retryRes.status}`)
        }
      } catch (e) {
        if (e instanceof AuthError) throw e
        // checkAuth failed (network error) — don't logout, just throw
        throw new AuthError(401, 'Erreur de connexion. Veuillez vérifier votre connexion internet.')
      }
    }

    // Not authenticated and re-auth didn't help — log out gracefully
    await logout()
    throw new AuthError(401, 'Session expirée. Veuillez vous reconnecter.')
  }

  // ─── 403 Forbidden → access denied, don't logout ────────────────────────
  if (res.status === 403) {
    throw new AuthError(403, 'Accès refusé.')
  }

  // ─── Other non-OK response — try to extract server error message ────────
  if (!res.ok) {
    let message = `Erreur ${res.status}`
    try {
      const data = await res.json()
      if (data.error && typeof data.error === 'string') {
        message = data.error
      }
    } catch {
      // Response body was not JSON — keep default message
    }
    throw new AuthError(res.status, message)
  }

  // Vérifie que la réponse est bien du JSON avant de parser
  const contentType = res.headers.get('content-type')
  if (!contentType || !contentType.includes('application/json')) {
    console.error(`[authFetch] Réponse non-JSON pour ${effectiveUrl}: content-type=${contentType}`)
    const text = await res.text()
    console.error(`[authFetch] Corps (début): ${text.slice(0, 200)}`)
    throw new AuthError(
      res.status,
      `La réponse du serveur n'est pas au format JSON (content-type: ${contentType || 'aucun'}). Veuillez réessayer ou contacter le support.`,
    )
  }

  const data = await res.json() as T

  // Cache successful GET responses
  if (cacheKey && !shouldSkipCache) {
    const customTtl = (options as RequestInit & { cacheTtl?: number })?.cacheTtl
    if (customTtl !== undefined && customTtl !== null) {
      // Explicit TTL override from caller
      setCachedData(cacheKey, data, customTtl, customTtl * 2)
    } else {
      // Use route-specific TTL
      const { ttl, staleWhileRevalidate } = getTtlForUrl(url)
      setCachedData(cacheKey, data, ttl, staleWhileRevalidate)
    }
  }

  // Auto-invalidate related caches on mutations
  if (options?.method && options.method.toUpperCase() !== 'GET') {
    autoInvalidateOnMutation(url)
  }

  return data
}

// ── Re-export cache utilities for backward compatibility ────────────────────
export { clearCache, invalidateCache } from '@/lib/response-cache'
