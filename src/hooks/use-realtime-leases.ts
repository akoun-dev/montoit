'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimeLeasePayload {
  id: string
  status: string
  start_date: string
  end_date: string
  monthly_rent: number
  charges: number
  deposit: number
  owner_signed_at: string | null
  tenant_signed_at: string | null
  property_id: string
  tenant_id: string
  owner_id: string
  created_at: string
  updated_at: string
}

type LeaseChangeEvent = 'INSERT' | 'UPDATE'

interface UseRealtimeLeasesOptions {
  userId: string | undefined
  onLeaseChange: (event: LeaseChangeEvent, payload: RealtimeLeasePayload) => void
}

/**
 * Subscribes to INSERT and UPDATE events on the `leases` table
 * via Supabase Realtime.
 *
 * The hook filters incoming events to only call `onLeaseChange` for leases
 * where the current user is either the tenant or the owner.
 */
export function useRealtimeLeases({ userId, onLeaseChange }: UseRealtimeLeasesOptions) {
  const callbackRef = useRef(onLeaseChange)
  callbackRef.current = onLeaseChange

  useEffect(() => {
    if (!userId) return

    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel('leases-realtime')
      .on<RealtimeLeasePayload>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leases',
        },
        (payload: RealtimePostgresChangesPayload<RealtimeLeasePayload>) => {
          const lease = payload.eventType === 'DELETE' ? payload.old : payload.new
          if (!lease?.id) return

          // Only process leases where the user is a participant
          if (lease.tenant_id !== userId && lease.owner_id !== userId) return

          callbackRef.current(payload.eventType as LeaseChangeEvent, lease)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[realtime-leases] Subscribed')
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[realtime-leases] Channel error')
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [userId])
}
