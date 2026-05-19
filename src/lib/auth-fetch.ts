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
  staleWhileRevalidate: number // Grace period to serve stale data while revalidating
}

const responseCache = new Map<string, CacheEntry>()

const DEFAULT_CACHE_TTL = 60_000 // 60 seconds (increased from 30s)
const DEFAULT_STALE_WHILE_REVALIDATE = 120_000 // 2 minutes grace period after TTL

// Route-specific TTL overrides
const ROUTE_TTL_OVERRIDES: Array<{ pattern: RegExp; ttl: number; staleWhileRevalidate: number }> = [
  // Dashboard stats — refresh less frequently
  { pattern: /\/api\/dashboard\//, ttl: 90_000, staleWhileRevalidate: 180_000 },
  // Property listings — moderate caching
  { pattern: /\/api\/properties(\?|$)/, ttl: 60_000, staleWhileRevalidate: 120_000 },
  // Single property — longer cache since data doesn't change often
  { pattern: /\/api\/properties\/[^/]+$/, ttl: 120_000, staleWhileRevalidate: 300_000 },
  // TC verifications list — moderate
  { pattern: /\/api\/tc\/verifications(\?|$)/, ttl: 45_000, staleWhileRevalidate: 90_000 },
  // Reviews — longer cache
  { pattern: /\/api\/properties\/reviews/, ttl: 120_000, staleWhileRevalidate: 300_000 },
  // Notifications — short cache
  { pattern: /\/api\/notifications/, ttl: 15_000, staleWhileRevalidate: 30_000 },
  // Inventory reports — moderate
  { pattern: /\/api\/tc\/inventory-reports/, ttl: 45_000, staleWhileRevalidate: 90_000 },
  // Agent list — longer cache (rarely changes)
  { pattern: /\/api\/tc\/agents/, ttl: 120_000, staleWhileRevalidate: 300_000 },
  // Missions — moderate
  { pattern: /\/api\/tc\/missions/, ttl: 60_000, staleWhileRevalidate: 120_000 },
  // Certifications — longer cache
  { pattern: /\/api\/tc\/certifications/, ttl: 90_000, staleWhileRevalidate: 180_000 },
  // Fraud alerts — short cache (urgent)
  { pattern: /\/api\/tc\/fraud-alerts/, ttl: 30_000, staleWhileRevalidate: 60_000 },
  // Litiges — moderate
  { pattern: /\/api\/tc\/litiges/, ttl: 60_000, staleWhileRevalidate: 120_000 },
  // Rental files — moderate
  { pattern: /\/api\/rental-files?/, ttl: 45_000, staleWhileRevalidate: 90_000 },
  // Lease data — longer cache
  { pattern: /\/api\/leases/, ttl: 90_000, staleWhileRevalidate: 180_000 },
  // Payments — moderate
  { pattern: /\/api\/payments/, ttl: 45_000, staleWhileRevalidate: 90_000 },
  // Favorites — short cache
  { pattern: /\/api\/favorites/, ttl: 30_000, staleWhileRevalidate: 60_000 },
]

function getTtlForUrl(url: string): { ttl: number; staleWhileRevalidate: number } {
  for (const override of ROUTE_TTL_OVERRIDES) {
    if (override.pattern.test(url)) {
      return { ttl: override.ttl, staleWhileRevalidate: override.staleWhileRevalidate }
    }
  }
  return { ttl: DEFAULT_CACHE_TTL, staleWhileRevalidate: DEFAULT_STALE_WHILE_REVALIDATE }
}

function getCacheKey(url: string, options?: RequestInit): string {
  const method = options?.method?.toUpperCase() || 'GET'
  // Only cache GET requests
  if (method !== 'GET') return ''
  return `${method}:${url}`
}

function getCachedData<T>(key: string): { data: T; isStale: boolean } | null {
  if (!key) return null
  const entry = responseCache.get(key)
  if (!entry) return null

  const now = Date.now()
  const age = now - entry.timestamp

  // Fresh data — return immediately
  if (age <= entry.ttl) {
    return { data: entry.data as T, isStale: false }
  }

  // Stale but within grace period — return stale data and trigger revalidation
  if (age <= entry.ttl + entry.staleWhileRevalidate) {
    return { data: entry.data as T, isStale: true }
  }

  // Completely expired — remove and return null
  responseCache.delete(key)
  return null
}

function setCachedData(key: string, data: unknown, ttl: number, staleWhileRevalidate?: number): void {
  if (!key) return
  responseCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
    staleWhileRevalidate: staleWhileRevalidate ?? DEFAULT_STALE_WHILE_REVALIDATE,
  })
  // Prune expired entries when cache gets large
  if (responseCache.size > 200) {
    const now = Date.now()
    for (const [k, v] of responseCache) {
      if (now - v.timestamp > v.ttl + v.staleWhileRevalidate) {
        responseCache.delete(k)
      }
    }
  }
}

/**
 * Clear the response cache. Pass a URL to clear only that entry, or omit to clear all.
 * Supports pattern-based clearing with a prefix (e.g., clearCache('/api/properties') clears all property-related caches).
 */
export function clearCache(url?: string): void {
  if (url) {
    // Try exact match first
    const key = getCacheKey(url)
    if (key) {
      responseCache.delete(key)
      return
    }
    // Try prefix match — clear all entries that start with this URL
    const prefix = `GET:${url}`
    for (const [k] of responseCache) {
      if (k.startsWith(prefix)) {
        responseCache.delete(k)
      }
    }
  } else {
    responseCache.clear()
  }
}

/**
 * Invalidate cache entries related to a specific entity after a mutation.
 * Call this after POST/PATCH/PUT/DELETE operations.
 */
export function invalidateCache(entityType: string, entityId?: string): void {
  const patterns: Record<string, string[]> = {
    property: ['/api/properties', '/api/tc/verifications', '/api/dashboard/'],
    rentalFile: ['/api/rental-file', '/api/rental-files', '/api/dashboard/'],
    lease: ['/api/leases', '/api/dashboard/'],
    payment: ['/api/payments', '/api/dashboard/'],
    notification: ['/api/notifications'],
    inventoryReport: ['/api/tc/inventory-reports', '/api/dashboard/'],
    mission: ['/api/tc/missions', '/api/dashboard/'],
    certification: ['/api/tc/certifications', '/api/dashboard/'],
    fraudAlert: ['/api/tc/fraud-alerts', '/api/dashboard/'],
    litige: ['/api/tc/litiges', '/api/dashboard/'],
    agent: ['/api/tc/agents', '/api/dashboard/'],
    favorite: ['/api/favorites'],
    review: ['/api/properties/reviews', '/api/properties'],
    user: ['/api/auth/me', '/api/dashboard/'],
  }

  const prefixes = patterns[entityType]
  if (!prefixes) return

  for (const prefix of prefixes) {
    const cacheKeyPrefix = `GET:${prefix}`
    for (const [k] of responseCache) {
      if (k.startsWith(cacheKeyPrefix)) {
        responseCache.delete(k)
      }
    }
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
  const cacheKey = getCacheKey(url, options)
  const customOptions = options as RequestInit & { skipCache?: boolean; cacheTtl?: number; timeout?: number }
  const shouldSkipCache = customOptions?.skipCache || customOptions?.cacheTtl === 0

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

  let res: Response
  try {
    res = await fetch(url, {
      ...options,
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
          const retryRes = await fetch(url, { ...options, credentials: 'include' })
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

/**
 * Background revalidation for stale-while-revalidate pattern.
 * Silently fetches fresh data and updates the cache.
 */
async function revalidateInBackground<T>(url: string, cacheKey: string): Promise<void> {
  try {
    const res = await fetch(url, { credentials: 'include' })
    if (res.ok) {
      const data = await res.json() as T
      const { ttl, staleWhileRevalidate } = getTtlForUrl(url)
      setCachedData(cacheKey, data, ttl, staleWhileRevalidate)
    }
  } catch {
    // Silently ignore revalidation errors — stale data remains available
  }
}

/**
 * Auto-invalidate cache entries after mutations.
 * When a POST/PATCH/PUT/DELETE is made, clear related GET cache entries.
 */
function autoInvalidateOnMutation(url: string): void {
  // Map mutation URLs to cache patterns that should be invalidated
  const invalidationMap: Array<{ pattern: RegExp; clearPrefixes: string[] }> = [
    { pattern: /\/api\/tc\/verifications/, clearPrefixes: ['/api/tc/verifications', '/api/dashboard/'] },
    { pattern: /\/api\/tc\/inventory-reports/, clearPrefixes: ['/api/tc/inventory-reports', '/api/dashboard/'] },
    { pattern: /\/api\/properties/, clearPrefixes: ['/api/properties', '/api/tc/verifications', '/api/dashboard/'] },
    { pattern: /\/api\/rental-files?/, clearPrefixes: ['/api/rental-file', '/api/rental-files', '/api/dashboard/'] },
    { pattern: /\/api\/leases/, clearPrefixes: ['/api/leases', '/api/dashboard/'] },
    { pattern: /\/api\/payments/, clearPrefixes: ['/api/payments', '/api/dashboard/'] },
    { pattern: /\/api\/notifications/, clearPrefixes: ['/api/notifications'] },
    { pattern: /\/api\/favorites/, clearPrefixes: ['/api/favorites'] },
    { pattern: /\/api\/signature/, clearPrefixes: ['/api/signature'] },
  ]

  for (const rule of invalidationMap) {
    if (rule.pattern.test(url)) {
      for (const prefix of rule.clearPrefixes) {
        clearCache(prefix)
      }
      break
    }
  }
}
