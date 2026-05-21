'use client'

import { create } from 'zustand'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/capacitor'
import type { RealtimePostgresChangesPayload, RealtimeChannel } from '@supabase/supabase-js'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────────────

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

interface NotificationStore {
  unreadCount: number
  notifications: Notification[]
  isConnected: boolean
  // Actions
  markAsRead: (notificationIds: string[]) => Promise<void>
  markAllRead: () => Promise<void>
  refreshNotifications: () => Promise<void>
  // Internal — called by useNotifications hook
  _init: (userId: string) => void
  _destroy: (userId: string) => void
}

// ─── Singleton Realtime subscription ────────────────────────────────────────
// Only one channel is ever created, with reference counting for cleanup.

let realtimeChannel: RealtimeChannel | null = null
let realtimeUserId: string | null = null
let subscriberCount = 0

function ensureRealtime(userId: string) {
  // Already subscribed for this user → just increment ref count
  if (realtimeChannel && realtimeUserId === userId) {
    subscriberCount++
    return
  }

  // Different user → tear down old, set up new
  if (realtimeChannel) {
    realtimeChannel.unsubscribe()
    realtimeChannel = null
  }

  realtimeUserId = userId

  const supabase = getSupabaseBrowserClient()

  realtimeChannel = supabase
    .channel('notifications-realtime')
    .on<Notification>(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
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

        useNotificationStore.setState((state) => ({
          unreadCount: state.unreadCount + 1,
          notifications: [mapped, ...state.notifications],
        }))

        toast(mapped.title, {
          description: mapped.message,
        })
      }
    )
    .subscribe((status) => {
      useNotificationStore.setState({ isConnected: status === 'SUBSCRIBED' })
    })

  subscriberCount = 1
}

function releaseRealtime(userId: string) {
  // Prevent race condition when user switches: if the channel was
  // already re-created for a different user, don't touch it.
  if (realtimeUserId !== userId) return

  subscriberCount--
  if (subscriberCount <= 0 && realtimeChannel) {
    realtimeChannel.unsubscribe()
    realtimeChannel = null
    realtimeUserId = null
    subscriberCount = 0
    useNotificationStore.setState({ isConnected: false })
  }
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useNotificationStore = create<NotificationStore>((set) => ({
  unreadCount: 0,
  notifications: [],
  isConnected: false,

  markAsRead: async (notificationIds: string[]) => {
    if (notificationIds.length === 0) return
    await apiFetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationIds }),
      credentials: 'include',
    })
    set((state) => ({
      unreadCount: Math.max(0, state.unreadCount - notificationIds.length),
      notifications: state.notifications.map((n) =>
        notificationIds.includes(n.id) ? { ...n, isRead: true } : n
      ),
    }))
  },

  markAllRead: async () => {
    await apiFetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
      credentials: 'include',
    })
    set((state) => ({
      unreadCount: 0,
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
    }))
  },

  refreshNotifications: async () => {
    try {
      const res = await apiFetch('/api/notifications?limit=1', { credentials: 'include' })
      const data = await res.json()
      set({ unreadCount: data.unreadCount || 0 })
    } catch {
      // Silently ignore — retry on next call
    }
  },

  _init: (userId: string) => {
    ensureRealtime(userId)
  },

  _destroy: (userId: string) => {
    releaseRealtime(userId)
  },
}))
