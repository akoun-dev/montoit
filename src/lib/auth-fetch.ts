/**
 * Authenticated fetch wrapper for API calls that require a valid session.
 *
 * - Automatically includes credentials (cookies) with every request
 * - On 401, attempts ONE re-validation via checkAuth()
 * - If re-validation also fails, then logs the user out
 * - On 5xx errors, does NOT log out (server might be temporarily down)
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

  // ─── Other non-OK response ──────────────────────────────────────────────
  if (!res.ok) {
    throw new AuthError(res.status, `Erreur ${res.status}`)
  }

  return res.json() as T
}
