'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { markMutation } from '@/lib/response-cache'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimeApplicationPayload {
  id: string
  rental_file_id: string
  property_id: string
  tenant_id: string
  status: string
  created_at: string
  updated_at: string
}

type ApplicationChangeEvent = 'INSERT' | 'UPDATE'

interface UseRealtimeApplicationsOptions {
  userId: string | undefined
  onApplicationChange: (event: ApplicationChangeEvent, payload: RealtimeApplicationPayload) => void
}

/**
 * Subscribes to INSERT and UPDATE events on the `applications` table
 * via Supabase Realtime.
 *
 * The hook filters incoming events to only call `onApplicationChange` for
 * applications where tenant_id matches the current user.
 */
export function useRealtimeApplications({ userId, onApplicationChange }: UseRealtimeApplicationsOptions) {
  const callbackRef = useRef(onApplicationChange)

  useEffect(() => {
    callbackRef.current = onApplicationChange
  }, [onApplicationChange])

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    const supabase = getSupabaseBrowserClient()

    // Create the channel synchronously so cleanup always works
    const channel = supabase.channel('applications-realtime')

    async function subscribeAfterAuth() {
      const { data: { session } } = await supabase.auth.getSession()

      if (cancelled) return

      if (!session?.access_token) {
        console.warn('[realtime-applications] No session — subscribing anyway (will likely fail)')
      }

      channel
        .on<RealtimeApplicationPayload>(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'applications',
          },            (payload: RealtimePostgresChangesPayload<RealtimeApplicationPayload>) => {
            const app = (payload.eventType === 'DELETE' ? payload.old : payload.new) as RealtimeApplicationPayload
            if (!app?.id) return

            // Only process applications where the user is the tenant
            if (app.tenant_id !== userId) return

            // Mark mutation so authFetch skips the response cache
            markMutation()

            callbackRef.current(payload.eventType as ApplicationChangeEvent, app)
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[realtime-applications] Subscribed')
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('[realtime-applications] Channel error')
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
