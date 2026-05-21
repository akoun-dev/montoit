'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimeVisitPayload {
  id: string
  status: string
  requested_date: string
  time_slot: string
  counter_date: string | null
  counter_time_slot: string | null
  owner_comment: string | null
  tenant_message: string | null
  created_at: string
  updated_at: string
  property_id: string
  tenant_id: string
}

type VisitChangeEvent = 'INSERT' | 'UPDATE'

interface UseRealtimeVisitsOptions {
  userId: string | undefined
  /**
   * The user's list of property IDs they own (proprietaire/agence).
   * If the user is a LOCATAIRE, this can be omitted — filtering is done
   * by `tenant_id`.
   */
  ownedPropertyIds?: string[]
  onVisitChange: (event: VisitChangeEvent, payload: RealtimeVisitPayload) => void
}

/**
 * Subscribes to INSERT and UPDATE events on the `visit_requests` table
 * via Supabase Realtime.
 *
 * The hook filters incoming events to only call `onVisitChange` for visits
 * relevant to the current user:
 *   - If `tenant_id === userId` → the user is the tenant
 *   - If `property_id` is in `ownedPropertyIds` → the user is the owner
 */
export function useRealtimeVisits({ userId, ownedPropertyIds, onVisitChange }: UseRealtimeVisitsOptions) {
  const callbackRef = useRef(onVisitChange)
  callbackRef.current = onVisitChange

  const ownedRef = useRef(ownedPropertyIds)
  ownedRef.current = ownedPropertyIds

  useEffect(() => {
    if (!userId) return

    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel('visits-realtime')
      .on<RealtimeVisitPayload>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visit_requests',
        },
        (payload: RealtimePostgresChangesPayload<RealtimeVisitPayload>) => {
          const visit = payload.eventType === 'DELETE' ? payload.old : payload.new
          if (!visit?.id) return

          // Skip if the visit isn't relevant to the current user
          const isTenant = visit.tenant_id === userId
          const isOwner = ownedRef.current?.includes(visit.property_id)

          if (!isTenant && !isOwner) return

          callbackRef.current(payload.eventType as VisitChangeEvent, visit)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[realtime-visits] Subscribed')
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[realtime-visits] Channel error')
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [userId])
}
