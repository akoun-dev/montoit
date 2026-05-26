/**
 * Simple in-memory rate limiter for API routes.
 *
 * Uses a sliding window approach with a Map of IP → timestamps.
 * Since this app runs on a self-hosted PM2 server (not serverless),
 * an in-memory approach is reliable. For multi-process PM2 clusters,
 * the rate limit is approximate (per-process), which is sufficient
 * for abuse prevention on OTP endpoints.
 */

interface RateLimiterOptions {
  /** Max requests allowed within the window */
  maxRequests: number
  /** Sliding window duration in milliseconds */
  windowMs: number
}

interface RateLimiterEntry {
  timestamps: number[]
}

const stores = new Map<string, Map<string, RateLimiterEntry>>()

function getStore(name: string): Map<string, RateLimiterEntry> {
  let store = stores.get(name)
  if (!store) {
    store = new Map()
    stores.set(name, store)
  }
  return store
}

/**
 * Check if a request is rate-limited.
 *
 * @param storeName - Logical name for the rate limiter (e.g. 'otp-sms', 'otp-email')
 * @param key - Unique identifier for the client (e.g. IP, phone, email)
 * @param options - Rate limiter configuration
 * @returns Object with `allowed` (boolean) and `remaining` (number of remaining requests)
 */
export function checkRateLimit(
  storeName: string,
  key: string,
  options: RateLimiterOptions
): { allowed: boolean; remaining: number } {
  const store = getStore(storeName)
  const now = Date.now()

  let entry = store.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    store.set(key, entry)
  }

  // Prune timestamps outside the window
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < options.windowMs)

  if (entry.timestamps.length >= options.maxRequests) {
    return { allowed: false, remaining: 0 }
  }

  entry.timestamps.push(now)
  return { allowed: true, remaining: options.maxRequests - entry.timestamps.length }
}

/**
 * Create a rate limit middleware function for Next.js API routes.
 *
 * @param storeName - Logical name for the rate limiter
 * @param options - Rate limiter configuration
 * @returns A function that returns true if allowed, or sends a 429 response
 */
export function createRateLimitMiddleware(
  storeName: string,
  options: RateLimiterOptions
) {
  return (key: string): { allowed: boolean; response?: Response } => {
    const result = checkRateLimit(storeName, key, options)
    if (!result.allowed) {
      const response = new Response(
        JSON.stringify({
          error: 'Trop de tentatives. Veuillez réessayer dans quelques minutes.',
          retryAfter: Math.ceil(options.windowMs / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(options.windowMs / 1000)),
            'X-RateLimit-Remaining': '0',
          },
        }
      )
      return { allowed: false, response }
    }
    return { allowed: true }
  }
}

/**
 * Clean up stale entries periodically to prevent memory leaks.
 * Call this once at startup.
 */
export function startRateLimiterCleanup(intervalMs = 5 * 60 * 1000): () => void {
  const timer = setInterval(() => {
    const now = Date.now()
    for (const [, store] of stores) {
      for (const [key, entry] of store) {
        entry.timestamps = entry.timestamps.filter((ts) => now - ts < 60_000)
        if (entry.timestamps.length === 0) {
          store.delete(key)
        }
      }
    }
  }, intervalMs)

  return () => clearInterval(timer)
}
