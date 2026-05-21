'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimeMessagePayload {
  id: string
  content: string
  created_at: string
  is_read: boolean
  conversation_id: string
  sender_id: string
}

interface UseRealtimeMessagesOptions {
  userId: string | undefined
  onNewMessage: (payload: RealtimeMessagePayload) => void
}

/**
 * Subscribes to INSERT events on the `messages` table via Supabase Realtime.
 *
 * When a new message is inserted, the `onNewMessage` callback is invoked
 * with the raw DB row (snake_case). The caller is responsible for:
 *   - Checking if the conversation belongs to the current user
 *   - Mapping snake_case → camelCase
 *   - Enriching with sender participant info from local state
 */
export function useRealtimeMessages({ userId, onNewMessage }: UseRealtimeMessagesOptions) {
  const callbackRef = useRef(onNewMessage)

  useEffect(() => {
    callbackRef.current = onNewMessage
  }, [onNewMessage])

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    const supabase = getSupabaseBrowserClient()

    // Create the channel synchronously so cleanup always works
    const channel = supabase.channel('messages-realtime')

    async function subscribeAfterAuth() {
      const { data: { session } } = await supabase.auth.getSession()

      if (cancelled) return

      if (!session?.access_token) {
        console.warn('[realtime-messages] No session — subscribing anyway (will likely fail)')
      }

      channel
        .on<RealtimeMessagePayload>(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          (payload: RealtimePostgresChangesPayload<RealtimeMessagePayload>) => {
            const msg = payload.new
            if (!msg?.id) return

            // Only process messages sent by OTHER users (our own messages are
            // already handled optimistically in the component)
            if (msg.sender_id === userId) return

            callbackRef.current(msg)
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[realtime-messages] Subscribed')
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('[realtime-messages] Channel error')
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
