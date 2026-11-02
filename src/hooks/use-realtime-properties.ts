'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimePropertyPayload {
  id: string
  title: string
  description: string
  type: string
  status: string
  rental_status: string
  price: number
  area: number
  bedrooms: number | null
  bathrooms: number | null
  address: string
  city: string
  commune: string | null
  latitude: number | null
  longitude: number | null
  is_furnished: boolean
  is_verified: boolean
  has_parking: boolean
  has_garden: boolean
  has_pool: boolean
  has_guardian: boolean
  has_climate: boolean
  amenities: string
  rental_terms: string
  hide_owner_name: boolean
  virtual_tour_url: string | null
  views_count: number
  owner_id: string
  created_at: string
  updated_at: string
}

type PropertyChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE'

interface UseRealtimePropertiesOptions {
  userId: string | undefined
  /**
   * IDs of properties owned by the current user (for owner/agency views).
   * If omitted, filtering is done by `owner_id`.
   */
  ownedPropertyIds?: string[]
  /**
   * If true, receives events for ALL properties — intended for TC/admin views
   * that need to see verification/moderation changes.
   */
  watchAll?: boolean
  onPropertyChange: (event: PropertyChangeEvent, payload: RealtimePropertyPayload) => void
}

/**
 * Subscribes to INSERT, UPDATE, and DELETE events on the `properties` table
 * via Supabase Realtime.
 *
 * The hook filters incoming events to only call `onPropertyChange` for
 * properties relevant to the current user:
 *   - If `owner_id === userId` → the user is the owner
 *   - If `id` is in `ownedPropertyIds` → the user is an agency or tracked owner
 *   - If `watchAll` is true → all property changes are forwarded (TC/admin)
 */
export function useRealtimeProperties({
  userId,
  ownedPropertyIds,
  watchAll,
  onPropertyChange,
}: UseRealtimePropertiesOptions) {
  const callbackRef = useRef(onPropertyChange)
  const ownedRef = useRef(ownedPropertyIds)
  const watchAllRef = useRef(watchAll)

  useEffect(() => {
    callbackRef.current = onPropertyChange
    ownedRef.current = ownedPropertyIds
    watchAllRef.current = watchAll
  }, [onPropertyChange, ownedPropertyIds, watchAll])

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    const supabase = getSupabaseBrowserClient()

    // Create the channel synchronously so cleanup always works
    const channel = supabase.channel('properties-realtime')

    async function subscribeAfterAuth() {
      const { data: { session } } = await supabase.auth.getSession()

      if (cancelled) return

      if (!session?.access_token) {
        console.warn('[realtime-properties] No session — subscribing anyway (will likely fail)')
      }

      channel
        .on<RealtimePropertyPayload>(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'properties',
          },
          (payload: RealtimePostgresChangesPayload<RealtimePropertyPayload>) => {
            const raw = payload.eventType === 'DELETE' ? payload.old : payload.new
            if (!raw?.id) return
            const property = raw as RealtimePropertyPayload

            // If watchAll is enabled, forward all events (TC/admin)
            if (watchAllRef.current) {
              callbackRef.current(payload.eventType as PropertyChangeEvent, property)
              return
            }

            // Skip if the property isn't relevant to the current user
            const isOwner = property.owner_id === userId
            const isWatched = ownedRef.current?.includes(property.id)

            if (!isOwner && !isWatched) return

            callbackRef.current(payload.eventType as PropertyChangeEvent, property)
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[realtime-properties] Subscribed')
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('[realtime-properties] Channel error')
          }
        })
    }

    subscribeAfterAuth()

    return () => {
      cancelled = true
      channel.unsubscribe()
    }
  }, [userId])
}
