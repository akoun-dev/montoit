'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimeFraudAlertPayload {
  id: string
  status: string
  description: string
  auto_detected: boolean
  resolution: string | null
  suspect_id: string
  reporter_id: string
  created_at: string
  updated_at: string
}

type FraudAlertChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE'

interface UseRealtimeFraudAlertsOptions {
  userId: string | undefined
  /**
   * If true, receives events for ALL fraud alerts — intended for TC/admin views
   * that manage fraud detection and resolution.
   */
  watchAll?: boolean
  /**
   * Optional list of suspect user IDs to watch.
   */
  watchedSuspectIds?: string[]
  onFraudAlertChange: (event: FraudAlertChangeEvent, payload: RealtimeFraudAlertPayload) => void
}

/**
 * Subscribes to INSERT, UPDATE, and DELETE events on the `fraud_alerts` table
 * via Supabase Realtime.
 *
 * ⚠️ SECURITY: Fraud alerts contain sensitive information. Only use `watchAll`
 * in TC/admin views. The hook does NOT perform server-side authorization —
 * the parent component is responsible for access control.
 *
 * The hook filters incoming events:
 *   - If `watchAll` is true → all fraud alerts (TC/admin)
 *   - If `suspect_id` is in `watchedSuspectIds` → tracked suspects
 *   - If `reporter_id === userId` → alerts the user reported
 */
export function useRealtimeFraudAlerts({
  userId,
  watchAll,
  watchedSuspectIds,
  onFraudAlertChange,
}: UseRealtimeFraudAlertsOptions) {
  const callbackRef = useRef(onFraudAlertChange)
  const watchedRef = useRef(watchedSuspectIds)
  const watchAllRef = useRef(watchAll)

  useEffect(() => {
    callbackRef.current = onFraudAlertChange
    watchedRef.current = watchedSuspectIds
    watchAllRef.current = watchAll
  }, [onFraudAlertChange, watchedSuspectIds, watchAll])

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    const supabase = getSupabaseBrowserClient()

    // Create the channel synchronously so cleanup always works
    const channel = supabase.channel('fraud-alerts-realtime')

    async function subscribeAfterAuth() {
      const { data: { session } } = await supabase.auth.getSession()

      if (cancelled) return

      if (!session?.access_token) {
        console.warn('[realtime-fraud-alerts] No session — subscribing anyway (will likely fail)')
      }

      channel
        .on<RealtimeFraudAlertPayload>(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'fraud_alerts',
          },
          (payload: RealtimePostgresChangesPayload<RealtimeFraudAlertPayload>) => {
            const raw = payload.eventType === 'DELETE' ? payload.old : payload.new
            if (!raw?.id) return
            const alert = raw as RealtimeFraudAlertPayload

            // If watchAll is enabled, forward all events (TC/admin)
            if (watchAllRef.current) {
              callbackRef.current(payload.eventType as FraudAlertChangeEvent, alert)
              return
            }

            // Check if the alert concerns a watched suspect
            const isWatchedSuspect = watchedRef.current?.includes(alert.suspect_id)
            if (isWatchedSuspect) {
              callbackRef.current(payload.eventType as FraudAlertChangeEvent, alert)
              return
            }

            // Otherwise, only forward if the user is the reporter
            if (alert.reporter_id === userId) {
              callbackRef.current(payload.eventType as FraudAlertChangeEvent, alert)
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[realtime-fraud-alerts] Subscribed')
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('[realtime-fraud-alerts] Channel error')
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
