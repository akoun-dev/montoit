'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { clearCache } from '@/lib/response-cache'

/**
 * Hook for cached data fetching with auto-refresh and stale-while-revalidate.
 *
 * Usage:
 * ```tsx
 * const { data, loading, error, refetch } = useCachedFetch<MyData>('/api/my-endpoint', {
 *   enabled: true,
 *   autoRefresh: false,
 * })
 * ```
 */

interface UseCachedFetchOptions {
  /** Whether the fetch should be executed (default: true) */
  enabled?: boolean
  /** Auto-refresh interval in milliseconds (default: 0 = disabled) */
  autoRefresh?: number
  /** Custom cache TTL override in ms */
  cacheTtl?: number
  /** Skip cache entirely and always fetch fresh */
  skipCache?: boolean
  /** Dependencies array — refetch when these change */
  deps?: unknown[]
}

interface UseCachedFetchResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCachedFetch<T = unknown>(
  url: string | null,
  options: UseCachedFetchOptions = {}
): UseCachedFetchResult<T> {
  const {
    enabled = true,
    autoRefresh = 0,
    cacheTtl,
    skipCache = false,
    deps = [],
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  const fetchData = useCallback(async () => {
    if (!url || !enabled) return

    setLoading(true)
    setError(null)

    try {
      const result = await authFetch<T>(url, {
        cacheTtl,
        skipCache,
      } as RequestInit & { cacheTtl?: number; skipCache?: boolean })
      if (mountedRef.current) {
        setData(result)
        setError(null)
      }
    } catch (err) {
      if (mountedRef.current) {
        if (err instanceof AuthError) {
          setError(err.message)
        } else {
          setError(err instanceof Error ? err.message : 'Erreur inconnue')
        }
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [url, enabled, cacheTtl, skipCache])

  // Initial fetch + dependency-based refetch
  useEffect(() => {
    mountedRef.current = true
    if (url && enabled) {
      fetchData()
    }
    return () => {
      mountedRef.current = false
    }
  }, [url, enabled, fetchData, ...deps])

  // Auto-refresh interval
  useEffect(() => {
    if (autoRefresh > 0 && url && enabled) {
      refreshTimerRef.current = setInterval(() => {
        fetchData()
      }, autoRefresh)
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
    }
  }, [autoRefresh, url, enabled, fetchData])

  const refetch = useCallback(async () => {
    // Clear the cache for this URL before refetching
    if (url) {
      clearCache(url)
    }
    await fetchData()
  }, [url, fetchData])

  return { data, loading, error, refetch }
}

/**
 * Hook for managing a paginated cached list with infinite scroll support.
 */

interface UsePaginatedFetchOptions extends UseCachedFetchOptions {
  /** Page size (default: 20) */
  pageSize?: number
}

interface UsePaginatedFetchResult<T> {
  data: T[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  refetch: () => Promise<void>
}

export function usePaginatedFetch<T = unknown>(
  urlBuilder: (offset: number, limit: number) => string | null,
  options: UsePaginatedFetchOptions = {}
): UsePaginatedFetchResult<T> {
  const { pageSize = 20, enabled = true, deps = [] } = options

  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const mountedRef = useRef(true)

  const fetchPage = useCallback(async (currentOffset: number, append: boolean) => {
    const url = urlBuilder(currentOffset, pageSize)
    if (!url || !enabled) return

    if (!append) setLoading(true)
    else setLoadingMore(true)
    setError(null)

    try {
      const result = await authFetch<{ items: T[]; pagination?: { hasMore: boolean } }>(url)
      if (mountedRef.current) {
        const items = result.items || []
        if (append) {
          setData((prev) => [...prev, ...items])
        } else {
          setData(items)
        }
        setHasMore(result.pagination?.hasMore ?? false)
        setOffset(currentOffset + items.length)
      }
    } catch (err) {
      if (mountedRef.current) {
        if (err instanceof AuthError) {
          setError(err.message)
        } else {
          setError(err instanceof Error ? err.message : 'Erreur inconnue')
        }
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [urlBuilder, pageSize, enabled])

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true
    if (enabled) {
      fetchPage(0, false)
    }
    return () => {
      mountedRef.current = false
    }
  }, [enabled, fetchPage, ...deps])

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return
    await fetchPage(offset, true)
  }, [hasMore, loadingMore, offset, fetchPage])

  const refetch = useCallback(async () => {
    setOffset(0)
    setHasMore(true)
    await fetchPage(0, false)
  }, [fetchPage])

  return { data, loading, loadingMore, error, hasMore, loadMore, refetch }
}
