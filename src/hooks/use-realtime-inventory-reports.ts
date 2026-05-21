'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimeInventoryReportPayload {
  id: string
  type: string
  status: string
  completed_at: string | null
  owner_signed_at: string | null
  tenant_signed_at: string | null
  general_observations: string | null
  total_keys: number | null
  created_at: string
  updated_at: string
  property_id: string
  reviewer_id: string
  lease_id: string | null
}

type InventoryReportEvent = 'INSERT' | 'UPDATE' | 'DELETE'

interface UseRealtimeInventoryReportsOptions {
  userId: string | undefined
  /**
   * If true, watches ALL inventory_reports (TC/admin).
   */
  watchAll?: boolean
  /**
   * List of lease IDs the user is involved in (for owner/tenant).
   */
  participantLeaseIds?: string[]
  onInventoryReportChange: (event: InventoryReportEvent, payload: RealtimeInventoryReportPayload) => void
}

/**
 * Subscribes to all events on the `inventory_reports` table
 * via Supabase Realtime.
 *
 * Filters by:
 *   - `reviewer_id === userId` (TC reviewer)
 *   - `lease_id` in `participantLeaseIds` (owner/tenant)
 *   - OR `watchAll` (admin)
 */
export function useRealtimeInventoryReports({
  userId,
  watchAll,
  participantLeaseIds,
  onInventoryReportChange,
}: UseRealtimeInventoryReportsOptions) {
  const callbackRef = useRef(onInventoryReportChange)
  callbackRef.current = onInventoryReportChange

  const watchAllRef = useRef(watchAll)
  watchAllRef.current = watchAll

  const leaseIdsRef = useRef(participantLeaseIds)
  leaseIdsRef.current = participantLeaseIds

  useEffect(() => {
    if (!userId) return

    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel('inventory-reports-realtime')
      .on<RealtimeInventoryReportPayload>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_reports',
        },
        (payload: RealtimePostgresChangesPayload<RealtimeInventoryReportPayload>) => {
          const raw = payload.eventType === 'DELETE' ? payload.old : payload.new
          if (!raw?.id) return

          const report = raw as RealtimeInventoryReportPayload

          // Filter: watchAll, own review, or participant lease
          if (watchAllRef.current) {
            callbackRef.current(payload.eventType as InventoryReportEvent, report)
            return
          }

          const isReviewer = report.reviewer_id === userId
          const isParticipant = leaseIdsRef.current?.includes(report.lease_id ?? '')

          if (!isReviewer && !isParticipant) return

          callbackRef.current(payload.eventType as InventoryReportEvent, report)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[realtime-inventory-reports] Subscribed')
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[realtime-inventory-reports] Channel error')
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [userId])
}
