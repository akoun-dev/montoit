'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/lib/auth-store'

/**
 * Hook to manage favorite state for property cards.
 * - Checks if the current user has favorited specific properties
 * - Provides a toggle function that calls the API
 * - Syncs favorite state with the database
 *
 * Uses JSON.stringify-based key comparison to prevent infinite re-renders
 * from array reference changes, and uses a ref for favoritesMap in
 * toggleFavorite to break the dependency cycle.
 */
export function useFavorites(propertyIds: string[] = []) {
  const { isAuthenticated } = useAuthStore()
  const [favoritesMap, setFavoritesMap] = useState<Record<string, boolean>>({})

  // Use a ref to access current favoritesMap in callbacks without
  // adding it as a dependency (which would cause infinite re-renders)
  const favoritesMapRef = useRef(favoritesMap)
  useEffect(() => {
    favoritesMapRef.current = favoritesMap
  }, [favoritesMap])

  // Keep propertyIds in a ref so the effect can access the latest value
  // without having it as a dependency (which would cause infinite re-renders
  // due to array reference changes on every render)
  const propertyIdsRef = useRef(propertyIds)
  useEffect(() => {
    propertyIdsRef.current = propertyIds
  }, [propertyIds])

  // Create a stable serialized key from propertyIds.
  // When the actual IDs change, this string changes, triggering the check effect.
  // When only the array reference changes (same IDs), the string stays the same.
  const propertyIdsKey = JSON.stringify(propertyIds)

  // Check favorites for a list of property IDs
  const checkFavorites = useCallback(async (ids: string[]) => {
    if (!isAuthenticated || ids.length === 0) {
      setFavoritesMap({})
      return
    }

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
    }
  }, [isAuthenticated])

  // Check favorites when propertyIds change (using stable serialized key)
  useEffect(() => {
    const ids = propertyIdsRef.current
    if (ids.length > 0) {
      checkFavorites(ids)
    }
  }, [propertyIdsKey, checkFavorites])

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
  // Uses favoritesMapRef instead of favoritesMap as a dependency
  // to avoid the callback being recreated on every state change
  const toggleFavorite = useCallback(async (propertyId: string): Promise<boolean> => {
    if (!isAuthenticated) return false

    // Optimistic update using the ref for the current value
    const currentFav = favoritesMapRef.current[propertyId] ?? false
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
      } else {
        // Revert optimistic update on server error
        setFavoritesMap((prev) => ({ ...prev, [propertyId]: currentFav }))
      }
    } catch {
      // Revert optimistic update on failure
      setFavoritesMap((prev) => ({ ...prev, [propertyId]: currentFav }))
    }
    return currentFav
  }, [isAuthenticated]) // No favoritesMap dependency!

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
