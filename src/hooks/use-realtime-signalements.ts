'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimeSignalementPayload {
  id: string
  reason: string
  description: string
  status: string
  admin_notes: string | null
  resolution: string | null
  entity_type: string
  entity_id: string
  created_at: string
  updated_at: string
  reporter_id: string
  handled_by_id: string | null
}

type SignalementChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE'

interface UseRealtimeSignalementsOptions {
  userId: string | undefined
  /**
   * If true, watches ALL signalements (admin). Only admins should use this.
   */
  watchAll?: boolean
  onSignalementChange: (event: SignalementChangeEvent, payload: RealtimeSignalementPayload) => void
}

/**
 * Subscribes to all events on the `signalements` table
 * via Supabase Realtime.
 *
 * Filters by:
 *   - `watchAll` (admin seeing all signalements)
 *   - `reporter_id === userId` (own signalements)
 *   - `handled_by_id === userId` (assigned as handler)
 */
export function useRealtimeSignalements({
  userId,
  watchAll,
  onSignalementChange,
}: UseRealtimeSignalementsOptions) {
  const callbackRef = useRef(onSignalementChange)
  const watchAllRef = useRef(watchAll)

  useEffect(() => {
    callbackRef.current = onSignalementChange
    watchAllRef.current = watchAll
  }, [onSignalementChange, watchAll])

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    const supabase = getSupabaseBrowserClient()

    // Create the channel synchronously so cleanup always works
    const channel = supabase.channel('signalements-realtime')

    async function subscribeAfterAuth() {
      const { data: { session } } = await supabase.auth.getSession()

      if (cancelled) return

      if (!session?.access_token) {
        console.warn('[realtime-signalements] No session — subscribing anyway (will likely fail)')
      }

      channel
        .on<RealtimeSignalementPayload>(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'signalements',
          },
          (payload: RealtimePostgresChangesPayload<RealtimeSignalementPayload>) => {
            const raw = payload.eventType === 'DELETE' ? payload.old : payload.new
            if (!raw?.id) return

            const sig = raw as RealtimeSignalementPayload

            // Filter: watchAll or own report or assigned as handler
            if (!watchAllRef.current && sig.reporter_id !== userId && sig.handled_by_id !== userId) return

            callbackRef.current(payload.eventType as SignalementChangeEvent, sig)
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[realtime-signalements] Subscribed')
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('[realtime-signalements] Channel error')
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
