'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { markMutation } from '@/lib/response-cache'
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

  useEffect(() => {
    callbackRef.current = onLeaseChange
  }, [onLeaseChange])

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    const supabase = getSupabaseBrowserClient()

    // Create the channel synchronously so cleanup always works
    const channel = supabase.channel('leases-realtime')

    async function subscribeAfterAuth() {
      const { data: { session } } = await supabase.auth.getSession()

      if (cancelled) return

      if (!session?.access_token) {
        console.warn('[realtime-leases] No session — subscribing anyway (will likely fail)')
      }

      channel
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

            // Mark mutation so authFetch skips the response cache
            markMutation()

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
    }

    subscribeAfterAuth()

    return () => {
      cancelled = true
      channel.unsubscribe()
    }
  }, [userId])
}
