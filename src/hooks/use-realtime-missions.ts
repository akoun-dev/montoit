'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimeMissionPayload {
  id: string
  type: string
  status: string
  priority: string
  notes: string | null
  report_url: string | null
  photo_urls: string
  scheduled_at: string
  completed_at: string | null
  feedback: string | null
  created_at: string
  updated_at: string
  property_id: string
  agent_id: string
  tc_id: string
  inventory_report_id: string | null
}

type MissionChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE'

interface UseRealtimeMissionsOptions {
  userId: string | undefined
  /**
   * If true, watches ALL missions (for admin).
   * Otherwise, filters by `tc_id`.
   */
  watchAll?: boolean
  onMissionChange: (event: MissionChangeEvent, payload: RealtimeMissionPayload) => void
}

/**
 * Subscribes to all events on the `missions` table
 * via Supabase Realtime.
 *
 * Filters by:
 *   - `tc_id === userId` (TC user's own missions)
 *   - OR `watchAll` (admin)
 */
export function useRealtimeMissions({ userId, watchAll, onMissionChange }: UseRealtimeMissionsOptions) {
  const callbackRef = useRef(onMissionChange)
  const watchAllRef = useRef(watchAll)

  useEffect(() => {
    callbackRef.current = onMissionChange
    watchAllRef.current = watchAll
  }, [onMissionChange, watchAll])

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    const supabase = getSupabaseBrowserClient()

    // Create the channel synchronously so cleanup always works
    const channel = supabase.channel('missions-realtime')

    async function subscribeAfterAuth() {
      const { data: { session } } = await supabase.auth.getSession()

      if (cancelled) return

      if (!session?.access_token) {
        console.warn('[realtime-missions] No session — subscribing anyway (will likely fail)')
      }

      channel
        .on<RealtimeMissionPayload>(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'missions',
          },
          (payload: RealtimePostgresChangesPayload<RealtimeMissionPayload>) => {
            const raw = payload.eventType === 'DELETE' ? payload.old : payload.new
            if (!raw?.id) return

            const mission = raw as RealtimeMissionPayload

            // watchAll forwards everything
            if (watchAllRef.current) {
              callbackRef.current(payload.eventType as MissionChangeEvent, mission)
              return
            }

            // Filter: only missions assigned to this TC user
            if (mission.tc_id !== userId) return

            callbackRef.current(payload.eventType as MissionChangeEvent, mission)
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[realtime-missions] Subscribed')
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('[realtime-missions] Channel error')
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
