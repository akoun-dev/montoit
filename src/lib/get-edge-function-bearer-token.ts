/**
 * Returns the appropriate Bearer token for authenticating with Supabase Edge Functions.
 *
 * ── Why this exists ────────────────────────────────────────────────────────────
 * The app supports two authentication modes:
 *
 * 1. **Supabase Auth** (email/password login) → user has a JWT `accessToken`
 *    that is scoped to their permissions. This is the preferred path.
 *
 * 2. **Custom session** (SMS OTP login) → no Supabase JWT exists (`accessToken` is
 *    null). The Edge Functions need a way to identify the user, so we fall back
 *    to the `SUPABASE_SERVICE_ROLE_KEY` (admin-level key) **only** when the
 *    authenticated user was resolved via a custom session.
 *
 * ── Safety guarantees ──────────────────────────────────────────────────────────
 * - The service_role key is NEVER exposed to unauthenticated requests. The caller
 *   MUST have already verified `userId` before calling this function.
 * - When the service_role fallback is used, the caller MUST also send the
 *   authenticated user's ID via the `x-user-id` header on the Edge Function request.
 * - `authSource` is explicitly checked — only `'session'` auth triggers the
 *   fallback. Any other value (including `null`) returns `null` when no
 *   accessToken is available.
 */

export function getEdgeFunctionBearerToken(
  accessToken: string | null,
  authSource: 'supabase' | 'session' | null,
): string | null {
  // Preferred path: user's own JWT, scoped to their permissions
  if (accessToken) {
    return accessToken
  }

  // Custom session (SMS OTP) users don't have a Supabase JWT.
  // The service_role key is required so the Edge Function can identify the user.
  // The caller must pass x-user-id alongside.
  if (authSource === 'session') {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      console.error(
        '[getEdgeFunctionBearerToken] SUPABASE_SERVICE_ROLE_KEY is not set',
      )
      return null
    }
    return serviceRoleKey
  }

  // No valid auth context — caller should treat this as unauthenticated
  return null
}
