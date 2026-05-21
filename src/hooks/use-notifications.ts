'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/capacitor'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  actionUrl?: string | null
  entityId?: string | null
  isRead: boolean
  createdAt: string
}

export function useNotifications() {
  const { user } = useAuthStore()
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isConnected, setIsConnected] = useState(false)

  /**
   * Refresh the unread notification count from the REST API.
   * Only updates `unreadCount` — never touches the `notifications` array
   * to avoid overwriting real-time data.
   */
  const refreshNotifications = useCallback(async () => {
    try {
      const res = await apiFetch('/api/notifications?limit=1', { credentials: 'include' })
      const data = await res.json()
      setUnreadCount(data.unreadCount || 0)
    } catch {
      // Silently ignore — retry on next call
    }
  }, [])

  useEffect(() => {
    if (!user) return

    const supabase = getSupabaseBrowserClient()

    // Subscribe to new notifications via Supabase Realtime
    const channel = supabase
      .channel('notifications-realtime')
      .on<Notification>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Notification>) => {
          const newNotif = payload.new as any
          if (!newNotif?.id) return

          const mapped: Notification = {
            id: newNotif.id,
            type: newNotif.type,
            title: newNotif.title,
            message: newNotif.message,
            actionUrl: newNotif.action_url ?? null,
            entityId: newNotif.entity_id ?? null,
            isRead: newNotif.is_read ?? false,
            createdAt: newNotif.created_at,
          }

          setUnreadCount((prev) => prev + 1)
          setNotifications((prev) => [mapped, ...prev])

          // Show toast notification
          toast(mapped.title, {
            description: mapped.message,
          })
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
        if (status === 'SUBSCRIBED') {
          console.log('[notifications] Realtime connected')
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[notifications] Realtime channel error')
        } else if (status === 'TIMED_OUT') {
          console.warn('[notifications] Realtime subscription timed out')
        } else if (status === 'CLOSED') {
          console.log('[notifications] Realtime channel closed')
        }
      })

    // Fetch initial unread count from REST API
    refreshNotifications()

    return () => {
      channel.unsubscribe()
      setIsConnected(false)
    }
  }, [user, refreshNotifications])

  const markAsRead = useCallback(async (notificationIds: string[]) => {
    if (notificationIds.length === 0) return

    await apiFetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationIds }),
      credentials: 'include',
    })

    setUnreadCount((prev) => Math.max(0, prev - notificationIds.length))
    setNotifications((prev) =>
      prev.map((n) =>
        notificationIds.includes(n.id) ? { ...n, isRead: true } : n
      )
    )
  }, [])

  const markAllRead = useCallback(async () => {
    await apiFetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
      credentials: 'include',
    })
    setUnreadCount(0)
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }, [])

  return {
    unreadCount,
    notifications,
    markAsRead,
    markAllRead,
    isConnected,
    refreshNotifications,
  }
}
