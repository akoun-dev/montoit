'use client'

import { useEffect } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/auth-store'
import { toast } from 'sonner'

/**
 * Standalone component that subscribes to Realtime INSERT events on the
 * `notifications` table and shows a toast for each new notification.
 *
 * Mounted once in the root layout so it has proper React context for sonner.
 */
export function NotificationToastProvider() {
  const { user } = useAuthStore()

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
            toast(String(n.title ?? 'Notification'), {
              description: String(n.message ?? ''),
            })
          }
        )
        .subscribe()
    }

    subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [user?.id])

  return null
}
