/**
 * Authenticated fetch wrapper for API calls that require a valid session.
 *
 * - Automatically includes credentials (cookies) with every request
 * - On 401, attempts to re-validate the session via checkAuth()
 * - If re-validation also fails, logs the user out gracefully
 * - Returns parsed JSON on success
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

/**
 * Fetch wrapper that ensures cookies are sent and handles 401 gracefully.
 * Returns parsed JSON on success, throws AuthError on auth/server failure.
 */
export async function authFetch<T = Record<string, unknown>>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
  })

  if (res.status === 401) {
    // Session might have expired — try to re-validate once
    const { checkAuth, logout, isAuthenticated } = useAuthStore.getState()

    if (isAuthenticated) {
      try {
        await checkAuth()
        const newState = useAuthStore.getState()
        if (newState.isAuthenticated) {
          // Re-auth succeeded — retry the original request
          const retryRes = await fetch(url, { ...options, credentials: 'include' })
          if (retryRes.ok) return retryRes.json() as T
          if (retryRes.status === 401) {
            // Still 401 after re-auth — session is truly invalid
            await logout()
            throw new AuthError(401, 'Session expirée. Veuillez vous reconnecter.')
          }
          throw new AuthError(retryRes.status, `Erreur ${retryRes.status}`)
        }
      } catch (e) {
        if (e instanceof AuthError) throw e
        // checkAuth failed (network error) — don't retry
      }
    }

    // Not authenticated or re-auth failed — log out silently
    await logout()
    throw new AuthError(401, 'Session expirée. Veuillez vous reconnecter.')
  }

  if (res.status === 403) {
    throw new AuthError(403, 'Accès refusé.')
  }

  if (!res.ok) {
    throw new AuthError(res.status, `Erreur ${res.status}`)
  }

  return res.json() as T
}
