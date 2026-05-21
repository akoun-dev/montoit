'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimeNotificationPayload {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  action_url: string | null
  entity_id: string | null
  user_id: string
  created_at: string
}

interface UseRealtimeNotificationsOptions {
  userId: string | undefined
  onNotificationChange: (payload: RealtimeNotificationPayload) => void
}

/**
 * Subscribes to INSERT and UPDATE events on the `notifications` table
 * via Supabase Realtime.
 *
 * Filters by `user_id` to only receive notifications for the current user.
 * Both INSERT (new notification) and UPDATE (mark as read) are forwarded
 * via the same callback — the caller can check `is_read` to differentiate.
 */
export function useRealtimeNotifications({ userId, onNotificationChange }: UseRealtimeNotificationsOptions) {
  const callbackRef = useRef(onNotificationChange)
  callbackRef.current = onNotificationChange

  useEffect(() => {
    if (!userId) return

    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel(`notifications-realtime-${userId}`)
      .on<RealtimeNotificationPayload>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        (payload: RealtimePostgresChangesPayload<RealtimeNotificationPayload>) => {
          const raw = payload.eventType === 'DELETE' ? payload.old : payload.new
          if (!raw?.id) return
          const notif = raw as RealtimeNotificationPayload
          if (notif.user_id !== userId) return
          callbackRef.current(notif)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[realtime-notifications] Subscribed for user ${userId}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[realtime-notifications] Channel error')
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [userId])
}
