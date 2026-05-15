'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/lib/auth-store'

/**
 * Hook to manage favorite state for property cards.
 * - Checks if the current user has favorited specific properties
 * - Provides a toggle function that calls the API
 * - Syncs favorite state with the database
 */
export function useFavorites(propertyIds: string[] = []) {
  const { isAuthenticated } = useAuthStore()
  const [favoritesMap, setFavoritesMap] = useState<Record<string, boolean>>({})
  const loadingRef = useRef(false)

  // Check favorites for a list of property IDs
  const checkFavorites = useCallback(async (ids: string[]) => {
    if (!isAuthenticated || ids.length === 0) {
      setFavoritesMap({})
      return
    }

    loadingRef.current = true
    try {
      const res = await fetch('/api/favorites/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ propertyIds: ids }),
      })
      if (res.ok) {
        const data = await res.json()
        setFavoritesMap(data.favorites ?? {})
      }
    } catch {
      // Silently fail
    } finally {
      loadingRef.current = false
    }
  }, [isAuthenticated])

  // Check favorites when propertyIds change
  useEffect(() => {
    if (propertyIds.length > 0) {
      checkFavorites(propertyIds)
    }
  }, [propertyIds, checkFavorites])

  // Check a single property's favorite status
  const checkSingle = useCallback(async (propertyId: string) => {
    if (!isAuthenticated) return false

    try {
      const res = await fetch('/api/favorites/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ propertyIds: [propertyId] }),
      })
      if (res.ok) {
        const data = await res.json()
        const isFav = data.favorites?.[propertyId] ?? false
        setFavoritesMap((prev) => ({ ...prev, [propertyId]: isFav }))
        return isFav
      }
    } catch {
      // Silently fail
    }
    return false
  }, [isAuthenticated])

  // Toggle favorite for a property
  const toggleFavorite = useCallback(async (propertyId: string): Promise<boolean> => {
    if (!isAuthenticated) return false

    // Optimistic update
    const currentFav = favoritesMap[propertyId] ?? false
    setFavoritesMap((prev) => ({ ...prev, [propertyId]: !currentFav }))

    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ propertyId }),
      })
      if (res.ok) {
        const data = await res.json()
        const isFav = data.isFavorite ?? false
        setFavoritesMap((prev) => ({ ...prev, [propertyId]: isFav }))
        return isFav
      }
    } catch {
      // Revert optimistic update on failure
      setFavoritesMap((prev) => ({ ...prev, [propertyId]: currentFav }))
    }
    return !currentFav
  }, [isAuthenticated, favoritesMap])

  // Check if a specific property is favorite
  const isFavorite = useCallback((propertyId: string): boolean => {
    return favoritesMap[propertyId] ?? false
  }, [favoritesMap])

  return {
    favoritesMap,
    isFavorite,
    toggleFavorite,
    checkSingle,
    checkFavorites,
  }
}
