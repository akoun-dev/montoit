'use client'

import { getSupabaseBrowserClient } from '@/lib/supabase/client'

/**
 * Capacitor detection and API URL redirection helper.
 *
 * In Capacitor (static APK build), the Next.js API routes are NOT available.
 * All relative `/api/...` calls must be redirected to a deployed backend
 * by prefixing with `NEXT_PUBLIC_CAPACITOR_API_URL`.
 *
 * Auth switches from cookie-based to token-based using the Supabase session
 * stored in cookies by @supabase/ssr's createBrowserClient.
 */

let _cachedIsCapacitor: boolean | null = null

/**
 * Check if the app is running inside a Capacitor WebView.
 * Uses lazy caching — only checks once.
 */
export function isCapacitor(): boolean {
  if (typeof window === 'undefined') return false
  if (_cachedIsCapacitor !== null) return _cachedIsCapacitor
  _cachedIsCapacitor = !!(
    (window as any).Capacitor?.isNativePlatform?.()
  )
  return _cachedIsCapacitor
}

/**
 * Get the base URL to prefix relative API calls with.
 * In Capacitor mode, returns the deployed API URL.
 * In web mode, returns empty string (relative paths work as-is).
 */
export function getApiBaseUrl(): string {
  if (!isCapacitor()) return ''
  return process.env.NEXT_PUBLIC_CAPACITOR_API_URL || ''
}

/**
 * Parse the Supabase auth token from document.cookie.
 *
 * @supabase/ssr's createBrowserClient stores the auth session in a cookie
 * named `sb-<project-ref>-auth-token`. The cookie value is a JSON object
 * containing `access_token`, `refresh_token`, etc.
 *
 * This is a sync fallback for when the Supabase client isn't available.
 */
function getAuthTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null
  try {
    for (const cookie of document.cookie.split('; ')) {
      const eqIdx = cookie.indexOf('=')
      const name = eqIdx > -1 ? cookie.slice(0, eqIdx) : cookie
      if (name.startsWith('sb-') && name.endsWith('-auth-token')) {
        const value = eqIdx > -1 ? cookie.slice(eqIdx + 1) : ''
        const parsed = JSON.parse(decodeURIComponent(value))
        if (parsed?.access_token) return parsed.access_token
      }
    }
  } catch {
    // Silently fail
  }
  return null
}

/**
 * Get the Supabase auth access token from localStorage (legacy fallback).
 *
 * Earlier versions of Supabase (or manual configurations) may store the
 * session in localStorage under `sb-<project-ref>-auth-token`.
 */
function getAuthTokenFromStorage(): string | null {
  if (typeof window === 'undefined') return null
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const stored = JSON.parse(localStorage.getItem(key) || '{}')
        if (stored?.access_token) return stored.access_token
      }
    }
  } catch {
    // Silently fail
  }
  return null
}

/**
 * Synchronous fallback to retrieve the Supabase access token.
 *
 * Priority:
 * 1. Parse from document.cookie (@supabase/ssr default storage)
 * 2. Parse from localStorage (legacy/manual setups)
 *
 * Returns `null` if no token is found.
 */
export function getAuthTokenSync(): string | null {
  return getAuthTokenFromCookie() || getAuthTokenFromStorage()
}

/**
 * Asynchronously retrieve the Supabase access token using the canonical API.
 *
 * Priority:
 * 1. supabase.auth.getSession() — the canonical way, reads from cookie storage
 * 2. Fallback to sync parsers (cookie → localStorage)
 *
 * This is the preferred method in Capacitor mode, as it uses the official
 * Supabase client and handles all storage backends correctly.
 */
export async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  try {
    const { data } = await getSupabaseBrowserClient().auth.getSession()
    if (data?.session?.access_token) {
      return data.session.access_token
    }
  } catch {
    // Supabase client unavailable — fall through to sync parsers
  }
  return getAuthTokenSync()
}

/**
 * Drop-in replacement for `fetch()` that handles Capacitor concerns:
 * 1. Prefixes relative `/api/...` URLs with the deployed API base URL
 * 2. Adds `Authorization: Bearer <token>` header from Supabase session
 * 3. Retains `credentials: 'include'` for cookie fallback
 *
 * In web mode, behaves exactly like native `fetch()`.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const baseUrl = getApiBaseUrl()

  // Build the effective URL — prefix relative paths in Capacitor mode
  let url = input instanceof Request ? input.url : String(input)
  if (baseUrl && url.startsWith('/')) {
    url = `${baseUrl.replace(/\/+$/, '')}${url}`
  }

  // In Capacitor mode, add auth token from Supabase session
  const newInit: RequestInit = { ...init }
  if (isCapacitor()) {
    newInit.credentials = 'include'
    const token = await getAuthToken()
    if (token) {
      newInit.headers = {
        ...((init?.headers as Record<string, string>) || {}),
        Authorization: `Bearer ${token}`,
      }
    }
  }

  return fetch(url, newInit)
}
