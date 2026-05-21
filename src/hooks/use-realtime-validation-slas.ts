'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimeValidationSlaPayload {
  id: string
  entity_type: string
  entity_id: string
  submitted_at: string
  deadline_at: string
  completed_at: string | null
  is_overdue: boolean
  created_at: string
  reviewer_id: string | null
}

type ValidationSlaEvent = 'INSERT' | 'UPDATE' | 'DELETE'

interface UseRealtimeValidationSlasOptions {
  userId: string | undefined
  /**
   * If true, watches ALL validation SLAs (for TC/admin).
   * Otherwise, filters by `reviewer_id`.
   */
  watchAll?: boolean
  onValidationSlaChange: (event: ValidationSlaEvent, payload: RealtimeValidationSlaPayload) => void
}

/**
 * Subscribes to all events on the `validation_slas` table
 * via Supabase Realtime.
 *
 * Filters by:
 *   - `reviewer_id === userId` (own SLA items)
 *   - OR `watchAll` (admin seeing all)
 */
export function useRealtimeValidationSlas({
  userId,
  watchAll,
  onValidationSlaChange,
}: UseRealtimeValidationSlasOptions) {
  const callbackRef = useRef(onValidationSlaChange)
  const watchAllRef = useRef(watchAll)

  useEffect(() => {
    callbackRef.current = onValidationSlaChange
    watchAllRef.current = watchAll
  }, [onValidationSlaChange, watchAll])

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    const supabase = getSupabaseBrowserClient()

    // Create the channel synchronously so cleanup always works
    const channel = supabase.channel('validation-slas-realtime')

    async function subscribeAfterAuth() {
      const { data: { session } } = await supabase.auth.getSession()

      if (cancelled) return

      if (!session?.access_token) {
        console.warn('[realtime-validation-slas] No session — subscribing anyway (will likely fail)')
      }

      channel
        .on<RealtimeValidationSlaPayload>(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'validation_slas',
          },
          (payload: RealtimePostgresChangesPayload<RealtimeValidationSlaPayload>) => {
            const raw = payload.eventType === 'DELETE' ? payload.old : payload.new
            if (!raw?.id) return

            const sla = raw as RealtimeValidationSlaPayload

            // Filter: watchAll or assigned to current reviewer
            if (!watchAllRef.current && sla.reviewer_id !== userId) return

            callbackRef.current(payload.eventType as ValidationSlaEvent, sla)
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[realtime-validation-slas] Subscribed')
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('[realtime-validation-slas] Channel error')
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
