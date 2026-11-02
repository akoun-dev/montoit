'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimeVerificationAgentPayload {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  tc_id: string
}

type VerificationAgentEvent = 'INSERT' | 'UPDATE' | 'DELETE'

interface UseRealtimeVerificationAgentsOptions {
  userId: string | undefined
  /**
   * If true, watches ALL verification agents (admin).
   * Otherwise, filters by `tc_id` (the TC that created them).
   */
  watchAll?: boolean
  onVerificationAgentChange: (event: VerificationAgentEvent, payload: RealtimeVerificationAgentPayload) => void
}

/**
 * Subscribes to all events on the `verification_agents` table
 * via Supabase Realtime.
 *
 * Filters by:
 *   - `tc_id === userId` (TC seeing own agents)
 *   - OR `watchAll` (admin seeing all)
 */
export function useRealtimeVerificationAgents({
  userId,
  watchAll,
  onVerificationAgentChange,
}: UseRealtimeVerificationAgentsOptions) {
  const callbackRef = useRef(onVerificationAgentChange)
  const watchAllRef = useRef(watchAll)

  useEffect(() => {
    callbackRef.current = onVerificationAgentChange
    watchAllRef.current = watchAll
  }, [onVerificationAgentChange, watchAll])

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    const supabase = getSupabaseBrowserClient()

    // Create the channel synchronously so cleanup always works
    const channel = supabase.channel('verification-agents-realtime')

    async function subscribeAfterAuth() {
      const { data: { session } } = await supabase.auth.getSession()

      if (cancelled) return

      if (!session?.access_token) {
        console.warn('[realtime-verification-agents] No session — subscribing anyway (will likely fail)')
      }

      channel
        .on<RealtimeVerificationAgentPayload>(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'verification_agents',
          },
          (payload: RealtimePostgresChangesPayload<RealtimeVerificationAgentPayload>) => {
            const raw = payload.eventType === 'DELETE' ? payload.old : payload.new
            if (!raw?.id) return

            const agent = raw as RealtimeVerificationAgentPayload

            // Filter: watchAll or own agents
            if (!watchAllRef.current && agent.tc_id !== userId) return

            callbackRef.current(payload.eventType as VerificationAgentEvent, agent)
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[realtime-verification-agents] Subscribed')
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('[realtime-verification-agents] Channel error')
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
