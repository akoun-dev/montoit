import { useQuery } from '@tanstack/react-query'
import { authFetch } from '@/lib/auth-fetch'

/**
 * Generic hook for cached data fetching with TanStack Query.
 * Reduces unnecessary API calls by caching responses.
 */
export function useCachedQuery<T>(
  queryKey: string[],
  url: string | null,
  options?: {
    enabled?: boolean
    staleTime?: number
  }
) {
  return useQuery({
    queryKey,
    queryFn: () => authFetch<T>(url!),
    enabled: !!url && (options?.enabled !== false),
    staleTime: options?.staleTime ?? 60_000, // 1 minute default
  })
}

// ─── Specific query hooks ──────────────────────────────────────────────────────

export function usePropertyDetail(propertyId: string | null) {
  return useCachedQuery<{ property: unknown }>(
    ['property', propertyId],
    propertyId ? `/api/properties/${propertyId}` : null,
    { staleTime: 2 * 60_000 } // 2 minutes for property details
  )
}

export function usePropertyReviews(propertyId: string | null) {
  return useCachedQuery<{ reviews: unknown[]; avgRating: number; totalReviews: number }>(
    ['property-reviews', propertyId],
    propertyId ? `/api/properties/reviews?propertyId=${propertyId}` : null,
    { staleTime: 5 * 60_000 } // 5 minutes for reviews
  )
}

export function useDashboardData(role: string | null) {
  const roleToPath: Record<string, string> = {
    LOCATAIRE: '/api/dashboard/locataire',
    PROPRIETAIRE: '/api/dashboard/proprietaire',
    AGENCE: '/api/dashboard/agence',
    ADMIN: '/api/dashboard/admin',
    TIERS_CONFIANCE: '/api/dashboard/tc',
  }

  const url = role ? roleToPath[role] : null

  return useCachedQuery<Record<string, unknown>>(
    ['dashboard', role],
    url,
    { staleTime: 30_000 } // 30 seconds for dashboard data (more dynamic)
  )
}

export function useNotifications() {
  return useCachedQuery<{ notifications: unknown[]; unreadCount: number }>(
    ['notifications'],
    '/api/notifications',
    { staleTime: 15_000 } // 15 seconds for notifications
  )
}

export function useTCVerifications(search?: string, commune?: string) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (commune) params.set('commune', commune)
  const qs = params.toString()

  return useCachedQuery<{ properties: unknown[] }>(
    ['tc-verifications', search ?? '', commune ?? ''],
    `/api/tc/verifications${qs ? `?${qs}` : ''}`,
    { staleTime: 30_000 } // 30 seconds
  )
}
