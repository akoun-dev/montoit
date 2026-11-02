'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimeMandatPayload {
  id: string
  type: string
  status: string
  commission_rate: number
  commission_type: string
  fixed_commission: number | null
  start_date: string
  end_date: string
  conditions: string | null
  owner_signed_at: string | null
  agency_signed_at: string | null
  terminated_at: string | null
  termination_reason: string | null
  created_at: string
  updated_at: string
  property_id: string
  owner_id: string
  agency_id: string
}

type MandatChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE'

interface UseRealtimeMandatsOptions {
  userId: string | undefined
  /**
   * If true, watches ALL mandats (for admin/TC).
   * Otherwise, filters by `owner_id` or `agency_id`.
   */
  watchAll?: boolean
  onMandatChange: (event: MandatChangeEvent, payload: RealtimeMandatPayload) => void
}

/**
 * Subscribes to all events on the `mandats` table
 * via Supabase Realtime.
 *
 * Filters by:
 *   - `owner_id === userId` (owner)
 *   - OR `agency_id === userId` (agency)
 *   - OR `watchAll` (admin/TC)
 */
export function useRealtimeMandats({ userId, watchAll, onMandatChange }: UseRealtimeMandatsOptions) {
  const callbackRef = useRef(onMandatChange)
  const watchAllRef = useRef(watchAll)

  useEffect(() => {
    callbackRef.current = onMandatChange
    watchAllRef.current = watchAll
  }, [onMandatChange, watchAll])

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    const supabase = getSupabaseBrowserClient()

    // Create the channel synchronously so cleanup always works
    const channel = supabase.channel('mandats-realtime')

    async function subscribeAfterAuth() {
      const { data: { session } } = await supabase.auth.getSession()

      if (cancelled) return

      if (!session?.access_token) {
        console.warn('[realtime-mandats] No session — subscribing anyway (will likely fail)')
      }

      channel
        .on<RealtimeMandatPayload>(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'mandats',
          },
          (payload: RealtimePostgresChangesPayload<RealtimeMandatPayload>) => {
            const raw = payload.eventType === 'DELETE' ? payload.old : payload.new
            if (!raw?.id) return

            const mandat = raw as RealtimeMandatPayload

            // watchAll forwards everything
            if (watchAllRef.current) {
              callbackRef.current(payload.eventType as MandatChangeEvent, mandat)
              return
            }

            // Filter: user is the owner or the agency
            const isOwner = mandat.owner_id === userId
            const isAgency = mandat.agency_id === userId

            if (!isOwner && !isAgency) return

            callbackRef.current(payload.eventType as MandatChangeEvent, mandat)
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[realtime-mandats] Subscribed')
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('[realtime-mandats] Channel error')
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
