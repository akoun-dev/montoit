/**
 * Authenticated fetch wrapper for API calls that require a valid session.
 *
 * - Automatically includes credentials (cookies) with every request
 * - On 401, attempts ONE re-validation via checkAuth()
 * - If re-validation also fails, then logs the user out
 * - On 5xx errors, does NOT log out (server might be temporarily down)
 * - Returns parsed JSON on success
 * - In-memory response cache for GET requests (bypassed for mutations)
 */

import { useAuthStore } from '@/lib/auth-store'

export class AuthError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'AuthError'
  }
}

// ── In-memory response cache (GET requests only) ────────────────────────────────

type CacheEntry = {
  data: unknown
  timestamp: number
  ttl: number
}

const responseCache = new Map<string, CacheEntry>()

const DEFAULT_CACHE_TTL = 30_000 // 30 seconds

function getCacheKey(url: string, options?: RequestInit): string {
  const method = options?.method?.toUpperCase() || 'GET'
  // Only cache GET requests
  if (method !== 'GET') return ''
  return `${method}:${url}`
}

function getCachedData<T>(key: string): T | null {
  if (!key) return null
  const entry = responseCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > entry.ttl) {
    responseCache.delete(key)
    return null
  }
  return entry.data as T
}

function setCachedData(key: string, data: unknown, ttl: number): void {
  if (!key) return
  responseCache.set(key, { data, timestamp: Date.now(), ttl })
  // Prune expired entries when cache gets large
  if (responseCache.size > 100) {
    const now = Date.now()
    for (const [k, v] of responseCache) {
      if (now - v.timestamp > v.ttl) {
        responseCache.delete(k)
      }
    }
  }
}

/**
 * Clear the response cache. Pass a URL to clear only that entry, or omit to clear all.
 */
export function clearCache(url?: string): void {
  if (url) {
    const key = getCacheKey(url)
    if (key) responseCache.delete(key)
  } else {
    responseCache.clear()
  }
}

/**
 * Fetch wrapper that ensures cookies are sent and handles 401 gracefully.
 * Returns parsed JSON on success, throws AuthError on auth/server failure.
 */
export async function authFetch<T = Record<string, unknown>>(
  url: string,
  options?: RequestInit & { cacheTtl?: number }
): Promise<T> {
  // Check cache for GET requests
  const cacheKey = getCacheKey(url, options)
  const cached = getCachedData<T>(cacheKey)
  if (cached !== null) return cached

  const res = await fetch(url, {
    ...options,
    credentials: 'include',
  })

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
          const retryRes = await fetch(url, { ...options, credentials: 'include' })
          if (retryRes.ok) return retryRes.json() as T
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

  const data = await res.json() as T

  // Cache successful GET responses
  if (cacheKey) {
    setCachedData(cacheKey, data, (options as RequestInit & { cacheTtl?: number })?.cacheTtl ?? DEFAULT_CACHE_TTL)
  }

  return data
}
