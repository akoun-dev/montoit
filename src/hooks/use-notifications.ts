'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { useNotificationStore } from '@/lib/notification-store'

export type { Notification } from '@/lib/notification-store'

/**
 * Hook that provides access to notification state.
 *
 * Uses a shared zustand store (`useNotificationStore`) that manages
 * a single Realtime subscription across all consumers — so multiple
 * components can call this hook without creating duplicate channels.
 */
export function useNotifications() {
  const { user } = useAuthStore()

  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const notifications = useNotificationStore((s) => s.notifications)
  const isConnected = useNotificationStore((s) => s.isConnected)

  const markAsRead = useNotificationStore((s) => s.markAsRead)
  const markAllRead = useNotificationStore((s) => s.markAllRead)
  const refreshNotifications = useNotificationStore((s) => s.refreshNotifications)
  const _init = useNotificationStore((s) => s._init)
  const _destroy = useNotificationStore((s) => s._destroy)

  useEffect(() => {
    if (!user) return

    // Register this component as a subscriber (increments ref count)
    _init(user.id)
    // Fetch initial unread count
    refreshNotifications()

    return () => {
      // Unregister (decrements ref count — real cleanup only when last subscriber leaves)
      _destroy(user.id)
    }
  }, [user, _init, _destroy, refreshNotifications])

  return {
    unreadCount,
    notifications,
    markAsRead,
    markAllRead,
    isConnected,
    refreshNotifications,
  }
}
