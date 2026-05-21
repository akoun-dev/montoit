'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimeMaintenancePayload {
  id: string
  title: string
  description: string
  status: string
  priority: string
  images: string
  resolution: string | null
  lease_id: string
  tenant_id: string
  created_at: string
  updated_at: string
}

type MaintenanceChangeEvent = 'INSERT' | 'UPDATE'

interface UseRealtimeMaintenanceOptions {
  userId: string | undefined
  /**
   * Lease IDs where the user is the owner.
   * Used to filter maintenance requests for owned properties.
   */
  ownerLeaseIds?: string[]
  onMaintenanceChange: (event: MaintenanceChangeEvent, payload: RealtimeMaintenancePayload) => void
}

/**
 * Subscribes to INSERT and UPDATE events on the `maintenance_requests` table
 * via Supabase Realtime.
 *
 * The hook filters incoming events to only call `onMaintenanceChange` for
 * requests relevant to the current user:
 *   - If `tenant_id === userId` → the user is the tenant who created it
 *   - If `lease_id` is in `ownerLeaseIds` → the user is the property owner
 */
export function useRealtimeMaintenance({ userId, ownerLeaseIds, onMaintenanceChange }: UseRealtimeMaintenanceOptions) {
  const callbackRef = useRef(onMaintenanceChange)
  const leaseIdsRef = useRef(ownerLeaseIds)

  useEffect(() => {
    callbackRef.current = onMaintenanceChange
    leaseIdsRef.current = ownerLeaseIds
  }, [onMaintenanceChange, ownerLeaseIds])

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    const supabase = getSupabaseBrowserClient()

    // Create the channel synchronously so cleanup always works
    const channel = supabase.channel('maintenance-realtime')

    async function subscribeAfterAuth() {
      const { data: { session } } = await supabase.auth.getSession()

      if (cancelled) return

      if (!session?.access_token) {
        console.warn('[realtime-maintenance] No session — subscribing anyway (will likely fail)')
      }

      channel
        .on<RealtimeMaintenancePayload>(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'maintenance_requests',
          },
          (payload: RealtimePostgresChangesPayload<RealtimeMaintenancePayload>) => {
            const req = payload.eventType === 'DELETE' ? payload.old : payload.new
            if (!req?.id) return

            // Skip if the request isn't relevant to the current user
            const isTenant = req.tenant_id === userId
            const isOwner = leaseIdsRef.current?.includes(req.lease_id)

            if (!isTenant && !isOwner) return

            callbackRef.current(payload.eventType as MaintenanceChangeEvent, req)
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[realtime-maintenance] Subscribed')
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('[realtime-maintenance] Channel error')
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
