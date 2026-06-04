/**
 * Shared in-memory response cache for GET requests.
 *
 * Extracted from auth-fetch.ts to break a circular dependency:
 *   auth-fetch.ts → capacitor.ts ← response-cache.ts ← auth-fetch.ts
 *
 * Both `authFetch` and `apiFetch` can import this module to invalidate
 * the cache after mutations (POST/PATCH/PUT/DELETE).
 */

// ── Cache storage ───────────────────────────────────────────────────────────

type CacheEntry = {
  data: unknown
  timestamp: number
  ttl: number
  staleWhileRevalidate: number
}

const responseCache = new Map<string, CacheEntry>()

// Track the last mutation timestamp so authFetch can skip cache after writes.
let lastMutationAt = 0

export function getLastMutationAt(): number {
  return lastMutationAt
}

export function markMutation(): void {
  lastMutationAt = Date.now()
}

// ── Route-specific TTL overrides ────────────────────────────────────────────

const ROUTE_TTL_OVERRIDES: Array<{ pattern: RegExp; ttl: number; staleWhileRevalidate: number }> = [
  { pattern: /\/api\/dashboard\//, ttl: 90_000, staleWhileRevalidate: 180_000 },
  { pattern: /\/api\/properties(\?|$)/, ttl: 60_000, staleWhileRevalidate: 120_000 },
  { pattern: /\/api\/properties\/[^/]+$/, ttl: 120_000, staleWhileRevalidate: 300_000 },
  { pattern: /\/api\/tc\/verifications(\?|$)/, ttl: 45_000, staleWhileRevalidate: 90_000 },
  { pattern: /\/api\/properties\/reviews/, ttl: 120_000, staleWhileRevalidate: 300_000 },
  { pattern: /\/api\/notifications/, ttl: 15_000, staleWhileRevalidate: 30_000 },
  { pattern: /\/api\/tc\/inventory-reports/, ttl: 45_000, staleWhileRevalidate: 90_000 },
  { pattern: /\/api\/tc\/agents/, ttl: 120_000, staleWhileRevalidate: 300_000 },
  { pattern: /\/api\/tc\/missions/, ttl: 60_000, staleWhileRevalidate: 120_000 },
  { pattern: /\/api\/tc\/certifications/, ttl: 90_000, staleWhileRevalidate: 180_000 },
  { pattern: /\/api\/tc\/fraud-alerts/, ttl: 30_000, staleWhileRevalidate: 60_000 },
  { pattern: /\/api\/tc\/litiges/, ttl: 60_000, staleWhileRevalidate: 120_000 },
  { pattern: /\/api\/tc\/owner-files/, ttl: 30_000, staleWhileRevalidate: 60_000 },
  { pattern: /\/api\/rental-files?/, ttl: 45_000, staleWhileRevalidate: 90_000 },
  { pattern: /\/api\/tc\/rental-files/, ttl: 30_000, staleWhileRevalidate: 60_000 },
  { pattern: /\/api\/leases/, ttl: 90_000, staleWhileRevalidate: 180_000 },
  { pattern: /\/api\/payments/, ttl: 45_000, staleWhileRevalidate: 90_000 },
  { pattern: /\/api\/favorites/, ttl: 30_000, staleWhileRevalidate: 60_000 },
]

// ── Public API ──────────────────────────────────────────────────────────────

export function getCacheKey(url: string, method?: string): string {
  const m = method?.toUpperCase() || 'GET'
  if (m !== 'GET') return ''
  return `${m}:${url}`
}

export function getTtlForUrl(url: string): { ttl: number; staleWhileRevalidate: number } {
  for (const override of ROUTE_TTL_OVERRIDES) {
    if (override.pattern.test(url)) {
      return { ttl: override.ttl, staleWhileRevalidate: override.staleWhileRevalidate }
    }
  }
  return { ttl: 60_000, staleWhileRevalidate: 120_000 }
}

export function getCachedData<T>(key: string): { data: T; isStale: boolean } | null {
  if (!key) return null
  const entry = responseCache.get(key)
  if (!entry) return null

  const now = Date.now()
  const age = now - entry.timestamp

  if (age <= entry.ttl) {
    return { data: entry.data as T, isStale: false }
  }

  if (age <= entry.ttl + entry.staleWhileRevalidate) {
    return { data: entry.data as T, isStale: true }
  }

  responseCache.delete(key)
  return null
}

export function setCachedData(
  key: string,
  data: unknown,
  ttl: number,
  staleWhileRevalidate?: number,
): void {
  if (!key) return
  responseCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
    staleWhileRevalidate: staleWhileRevalidate ?? 120_000,
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
 * Supports pattern-based clearing with a prefix.
 */
export function clearCache(url?: string): void {
  if (url) {
    const key = getCacheKey(url)
    if (key && responseCache.has(key)) {
      responseCache.delete(key)
      return
    }
    // Prefix match — clear all entries starting with this URL
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
 */
export function invalidateCache(entityType: string, _entityId?: string): void {
  const patterns: Record<string, string[]> = {
    property: ['/api/properties', '/api/tc/verifications', '/api/dashboard/'],
    rentalFile: ['/api/rental-file', '/api/rental-files', '/api/dashboard/'],
    rentalFileTc: ['/api/tc/rental-files', '/api/dashboard/'],
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
 * Auto-invalidate cache entries based on mutation URL pattern.
 *
 * Organized from most specific (deepest path) to most general.
 * Each rule clears all cache entries whose keys start with the given prefixes.
 */
export function autoInvalidateOnMutation(url: string): void {
  markMutation()

  // The order matters: specific patterns must come before general ones
  // so that /api/tc/rental-files matches before /api/rental-files? does.
  const invalidationMap: Array<{ pattern: RegExp; clearPrefixes: string[] }> = [
    // ── TC routes (most specific first) ───────────────────────────────────
    { pattern: /\/api\/tc\/rental-files/, clearPrefixes: ['/api/tc/rental-files', '/api/rental-files', '/api/rental-file', '/api/dashboard/'] },
    { pattern: /\/api\/tc\/owner-files/, clearPrefixes: ['/api/tc/owner-files', '/api/owner-file', '/api/dashboard/'] },
    { pattern: /\/api\/tc\/verifications/, clearPrefixes: ['/api/tc/verifications', '/api/properties', '/api/dashboard/'] },
    { pattern: /\/api\/tc\/inventory-reports/, clearPrefixes: ['/api/tc/inventory-reports', '/api/dashboard/'] },
    { pattern: /\/api\/tc\/ownership-docs/, clearPrefixes: ['/api/tc/ownership-docs', '/api/dashboard/'] },
    { pattern: /\/api\/tc\/certifications/, clearPrefixes: ['/api/tc/certifications', '/api/dashboard/'] },
    { pattern: /\/api\/tc\/fraud-alerts/, clearPrefixes: ['/api/tc/fraud-alerts', '/api/dashboard/'] },
    { pattern: /\/api\/tc\/litiges/, clearPrefixes: ['/api/tc/litiges', '/api/dashboard/'] },
    { pattern: /\/api\/tc\/agents/, clearPrefixes: ['/api/tc/agents', '/api/dashboard/'] },
    { pattern: /\/api\/tc\/agent-feedback/, clearPrefixes: ['/api/tc/agent-feedback', '/api/dashboard/'] },
    { pattern: /\/api\/tc\/missions/, clearPrefixes: ['/api/tc/missions', '/api/dashboard/'] },
    { pattern: /\/api\/tc\/messages/, clearPrefixes: ['/api/tc/messages', '/api/dashboard/'] },
    { pattern: /\/api\/tc\/oneci/, clearPrefixes: ['/api/tc/oneci'] },
    { pattern: /\/api\/tc\/properties/, clearPrefixes: ['/api/tc/properties', '/api/properties', '/api/dashboard/'] },

    // ── Admin routes ──────────────────────────────────────────────────────
    { pattern: /\/api\/admin\/properties-moderation/, clearPrefixes: ['/api/admin/properties-moderation', '/api/properties', '/api/dashboard/'] },
    { pattern: /\/api\/admin\/signalements/, clearPrefixes: ['/api/admin/signalements', '/api/dashboard/'] },
    { pattern: /\/api\/admin\/users/, clearPrefixes: ['/api/admin/users', '/api/dashboard/'] },
    { pattern: /\/api\/admin\/system/, clearPrefixes: ['/api/admin/system', '/api/dashboard/'] },

    // ── Agence routes ─────────────────────────────────────────────────────
    { pattern: /\/api\/agence\/agents/, clearPrefixes: ['/api/agence/agents', '/api/dashboard/'] },
    { pattern: /\/api\/agence\/commissions/, clearPrefixes: ['/api/agence/commissions', '/api/dashboard/'] },

    // ── Core business routes ──────────────────────────────────────────────
    { pattern: /\/api\/properties/, clearPrefixes: ['/api/properties', '/api/tc/verifications', '/api/dashboard/'] },
    { pattern: /\/api\/rental-files?/, clearPrefixes: ['/api/rental-file', '/api/rental-files', '/api/owner', '/api/applications', '/api/dashboard/'] },
    { pattern: /\/api\/leases/, clearPrefixes: ['/api/leases', '/api/dashboard/'] },
    { pattern: /\/api\/payments/, clearPrefixes: ['/api/payments', '/api/dashboard/'] },
    { pattern: /\/api\/applications/, clearPrefixes: ['/api/applications', '/api/dashboard/'] },
    { pattern: /\/api\/mandats/, clearPrefixes: ['/api/mandats', '/api/dashboard/'] },
    { pattern: /\/api\/signature/, clearPrefixes: ['/api/signature'] },

    // ── Visits & maintenance ──────────────────────────────────────────────
    { pattern: /\/api\/visits/, clearPrefixes: ['/api/visits', '/api/dashboard/'] },
    { pattern: /\/api\/maintenance/, clearPrefixes: ['/api/maintenance', '/api/dashboard/'] },

    // ── Messages & reviews ────────────────────────────────────────────────
    { pattern: /\/api\/messages/, clearPrefixes: ['/api/messages'] },
    { pattern: /\/api\/reviews/, clearPrefixes: ['/api/reviews', '/api/properties/reviews', '/api/properties', '/api/dashboard/'] },

    // ── Notifications & favorites ─────────────────────────────────────────
    { pattern: /\/api\/notifications/, clearPrefixes: ['/api/notifications'] },
    { pattern: /\/api\/favorites/, clearPrefixes: ['/api/favorites'] },

    // ── Owner & tenant routes ─────────────────────────────────────────────
    { pattern: /\/api\/owner-file/, clearPrefixes: ['/api/owner-file', '/api/dashboard/'] },
    { pattern: /\/api\/owner\//, clearPrefixes: ['/api/owner', '/api/dashboard/'] },
    { pattern: /\/api\/tenants/, clearPrefixes: ['/api/tenants', '/api/dashboard/'] },
    { pattern: /\/api\/locataire\//, clearPrefixes: ['/api/locataire', '/api/dashboard/'] },

    // ── User / profile / settings ─────────────────────────────────────────
    { pattern: /\/api\/auth/, clearPrefixes: ['/api/auth/me', '/api/dashboard/'] },
    { pattern: /\/api\/user\//, clearPrefixes: ['/api/user', '/api/profile', '/api/auth/me', '/api/scoring'] },
    { pattern: /\/api\/profile/, clearPrefixes: ['/api/profile', '/api/auth/me'] },
    { pattern: /\/api\/settings/, clearPrefixes: ['/api/settings', '/api/auth/me'] },

    // ── KYC / oneci / certificates ────────────────────────────────────────
    { pattern: /\/api\/kyc/, clearPrefixes: ['/api/kyc'] },
    { pattern: /\/api\/oneci/, clearPrefixes: ['/api/oneci'] },
    { pattern: /\/api\/certificates/, clearPrefixes: ['/api/certificates'] },

    // ── Misc routes ───────────────────────────────────────────────────────
    { pattern: /\/api\/scoring/, clearPrefixes: ['/api/scoring'] },
    { pattern: /\/api\/history/, clearPrefixes: ['/api/history'] },
    { pattern: /\/api\/stats/, clearPrefixes: ['/api/stats'] },
    { pattern: /\/api\/suta/, clearPrefixes: ['/api/suta'] },
    { pattern: /\/api\/seed/, clearPrefixes: [] },  // seeded data: clear nothing from cache since it's dev-only
    { pattern: /\/api\/migrate-videos/, clearPrefixes: ['/api/properties', '/api/dashboard/'] },
  ]

  for (const rule of invalidationMap) {
    if (rule.pattern.test(url)) {
      for (const prefix of rule.clearPrefixes) {
        clearCache(prefix)
      }
      // NO break — allow multiple rules to match (e.g. /api/tc/rental-files
      // matches both the TC-specific rule above AND the general rental-files rule)
    }
  }

  // Fallback: if nothing matched, clear the specific URL
  clearCache(url)
}
