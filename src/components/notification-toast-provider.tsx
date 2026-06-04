'use client'

import { useEffect } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/auth-store'
import { toast } from 'sonner'
import { isCapacitor } from '@/lib/capacitor'
import { useLocalNotifications } from '@/hooks/capacitor/use-local-notifications'

/**
 * Standalone component that subscribes to Realtime INSERT events on the
 * `notifications` table and shows:
 * 1. An in-app toast notification (web & mobile)
 * 2. A Capacitor local notification (mobile push)
 *
 * Mounted once in the root layout so it has proper React context for sonner.
 */
export function NotificationToastProvider() {
  const { user } = useAuthStore()
  const { schedule, requestPermissions } = useLocalNotifications()

  // Request Capacitor push permissions on mount (native only)
  useEffect(() => {
    if (isCapacitor()) {
      requestPermissions().catch(() => {})
    }
  }, [requestPermissions])

  useEffect(() => {
    const userId = user?.id
    if (!userId) return

    const supabase = getSupabaseBrowserClient()
    const channel = supabase.channel(`notification-toast-${userId}`)

    async function subscribe() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const n = payload.new as Record<string, unknown>
            if (!n?.id) return

            const title = String(n.title ?? 'Notification')
            const message = String(n.message ?? '')

            // 1. In-app toast (web & mobile)
            toast(title, { description: message })

            // 2. Capacitor local notification (push on mobile)
            if (isCapacitor()) {
              schedule([{
                id: Date.now(),
                title,
                body: message,
                smallIcon: 'ic_stat_notification',
                largeIcon: 'ic_launcher',
                actionTypeId: 'OPEN_APP',
                extra: {
                  notificationId: n.id as string,
                  actionUrl: (n.action_url as string) ?? '',
                  entityId: (n.entity_id as string) ?? '',
                },
              }]).catch(() => {})
            }
          }
        )
        .subscribe()
    }

    subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [user?.id, schedule])

  return null
}
