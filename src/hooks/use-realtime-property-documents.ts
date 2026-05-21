'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimePropertyDocPayload {
  id: string
  name: string
  type: string
  url: string
  description: string | null
  expiry_date: string | null
  created_at: string
  updated_at: string
  property_id: string
}

type PropertyDocChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE'

interface UseRealtimePropertyDocumentsOptions {
  userId: string | undefined
  /**
   * Only watch documents for a specific property.
   * If not provided, watches documents for all properties owned by the user.
   */
  watchedPropertyIds?: string[]
  onPropertyDocChange: (event: PropertyDocChangeEvent, payload: RealtimePropertyDocPayload) => void
}

/**
 * Subscribes to all events on the `property_documents` table
 * via Supabase Realtime.
 *
 * Filters by `property_id` matching one of the watched properties.
 * If no `watchedPropertyIds` are provided, forwards all events
 * (suitable for admin/TC).
 */
export function useRealtimePropertyDocuments({ userId, watchedPropertyIds, onPropertyDocChange }: UseRealtimePropertyDocumentsOptions) {
  const callbackRef = useRef(onPropertyDocChange)
  const watchedIdsRef = useRef(watchedPropertyIds)

  useEffect(() => {
    callbackRef.current = onPropertyDocChange
    watchedIdsRef.current = watchedPropertyIds
  }, [onPropertyDocChange, watchedPropertyIds])

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    const supabase = getSupabaseBrowserClient()

    // Create the channel synchronously so cleanup always works
    const channel = supabase.channel('property-documents-realtime')

    async function subscribeAfterAuth() {
      const { data: { session } } = await supabase.auth.getSession()

      if (cancelled) return

      if (!session?.access_token) {
        console.warn('[realtime-property-documents] No session — subscribing anyway (will likely fail)')
      }

      channel
        .on<RealtimePropertyDocPayload>(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'property_documents',
          },
          (payload: RealtimePostgresChangesPayload<RealtimePropertyDocPayload>) => {
            const raw = payload.eventType === 'DELETE' ? payload.old : payload.new
            if (!raw?.id) return

            const doc = raw as RealtimePropertyDocPayload

            // If specific property IDs are watched, filter by them
            const watchedIds = watchedIdsRef.current
            if (watchedIds && watchedIds.length > 0) {
              if (!watchedIds.includes(doc.property_id)) return
            }

            callbackRef.current(payload.eventType as PropertyDocChangeEvent, doc)
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[realtime-property-documents] Subscribed')
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('[realtime-property-documents] Channel error')
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
