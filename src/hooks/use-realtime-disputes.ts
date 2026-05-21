'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimeDisputePayload {
  id: string
  type: string
  description: string
  status: string
  priority: string
  resolution: string | null
  tc_comment: string | null
  investigation_notes: string | null
  evidence_urls: string
  is_escalated: boolean
  escalated_at: string | null
  escalation_reason: string | null
  lease_id: string
  reported_by_id: string
  resolved_by_id: string | null
  handled_by_id: string | null
  created_at: string
  updated_at: string
}

type DisputeChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE'

interface UseRealtimeDisputesOptions {
  userId: string | undefined
  /**
   * Lease IDs where the user is a participant (tenant or owner).
   * Used to filter disputes for non-TC/non-admin users.
   */
  participantLeaseIds?: string[]
  /**
   * If true, receives events for ALL disputes — intended for TC/admin views.
   */
  watchAll?: boolean
  onDisputeChange: (event: DisputeChangeEvent, payload: RealtimeDisputePayload) => void
}

/**
 * Subscribes to INSERT, UPDATE, and DELETE events on the `disputes` table
 * via Supabase Realtime.
 *
 * The hook filters incoming events to only call `onDisputeChange` for
 * disputes relevant to the current user:
 *   - If `watchAll` is true → all disputes (TC/admin)
 *   - If `reported_by_id === userId` → the user reported the dispute
 *   - If `lease_id` is in `participantLeaseIds` → the user is a party to the lease
 */
export function useRealtimeDisputes({
  userId,
  participantLeaseIds,
  watchAll,
  onDisputeChange,
}: UseRealtimeDisputesOptions) {
  const callbackRef = useRef(onDisputeChange)
  const leaseIdsRef = useRef(participantLeaseIds)
  const watchAllRef = useRef(watchAll)

  useEffect(() => {
    callbackRef.current = onDisputeChange
    leaseIdsRef.current = participantLeaseIds
    watchAllRef.current = watchAll
  }, [onDisputeChange, participantLeaseIds, watchAll])

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    const supabase = getSupabaseBrowserClient()

    // Create the channel synchronously so cleanup always works
    const channel = supabase.channel('disputes-realtime')

    async function subscribeAfterAuth() {
      const { data: { session } } = await supabase.auth.getSession()

      if (cancelled) return

      if (!session?.access_token) {
        console.warn('[realtime-disputes] No session — subscribing anyway (will likely fail)')
      }

      channel
        .on<RealtimeDisputePayload>(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'disputes',
          },
          (payload: RealtimePostgresChangesPayload<RealtimeDisputePayload>) => {
            const raw = payload.eventType === 'DELETE' ? payload.old : payload.new
            if (!raw?.id) return
            const dispute = raw as RealtimeDisputePayload

            // If watchAll is enabled, forward all events (TC/admin)
            if (watchAllRef.current) {
              callbackRef.current(payload.eventType as DisputeChangeEvent, dispute)
              return
            }

            // Skip if the dispute isn't relevant to the current user
            const isReporter = dispute.reported_by_id === userId
            const isParticipant = leaseIdsRef.current?.includes(dispute.lease_id)

            if (!isReporter && !isParticipant) return

            callbackRef.current(payload.eventType as DisputeChangeEvent, dispute)
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[realtime-disputes] Subscribed')
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('[realtime-disputes] Channel error')
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
