'use client'

import { create } from 'zustand'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/capacitor'
import type { RealtimePostgresChangesPayload, RealtimeChannel } from '@supabase/supabase-js'

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
  markAsRead: (notificationIds: string[]) => Promise<void>
  markAllRead: () => Promise<void>
  refreshNotifications: () => Promise<void>
  _init: (userId: string) => void
  _destroy: (userId: string) => void
}

// ─── Singleton Realtime subscription ────────────────────────────────────────

let realtimeChannel: RealtimeChannel | null = null
let realtimeUserId: string | null = null
let subscriberCount = 0

// Track known notification IDs so polling doesn't re-add duplicates
const knownIds = new Set<string>()

let pollInterval: ReturnType<typeof setInterval> | null = null
let pollUserId: string | null = null

function startPolling(userId: string) {
  if (pollInterval) return
  pollUserId = userId

  pollInterval = setInterval(async () => {
    try {
      const res = await apiFetch('/api/notifications?page=1&limit=5', { credentials: 'include' })
      if (!res.ok) return
      const body = await res.json()
      const list: Notification[] = body.data ?? []

      const newNotifs: Notification[] = []
      for (const n of list) {
        if (!knownIds.has(n.id)) {
          knownIds.add(n.id)
          newNotifs.push(n)
        }
      }

      if (newNotifs.length === 0) return

      useNotificationStore.setState((state) => {
        const existing = new Map(state.notifications.map((n) => [n.id, n]))
        let unreadDelta = 0
        for (const n of newNotifs) {
          if (!existing.has(n.id)) {
            existing.set(n.id, n)
            if (!n.isRead) unreadDelta++
          }
        }
        return {
          unreadCount: state.unreadCount + unreadDelta,
          notifications: Array.from(existing.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ),
        }
      })
    } catch {
      // Silently ignore — retry on next interval
    }
  }, 10_000)
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
    pollUserId = null
  }
}

function ensureRealtime(userId: string) {
  if (realtimeChannel && realtimeUserId === userId) {
    subscriberCount++
    return
  }

  if (realtimeChannel) {
    realtimeChannel.unsubscribe()
    realtimeChannel = null
  }

  realtimeUserId = userId

  const supabase = getSupabaseBrowserClient()

  const channel = supabase.channel('notifications-realtime')
  realtimeChannel = channel

  async function subscribeAfterAuth() {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) {
      console.warn('[notifications-store] No session — subscribing anyway (will likely fail)')
    }

    channel
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

          knownIds.add(mapped.id)
        }
      )
      .subscribe((status) => {
        useNotificationStore.setState({ isConnected: status === 'SUBSCRIBED' })
      })
  }

  subscribeAfterAuth()

  subscriberCount = 1
}

function releaseRealtime(userId: string) {
  if (realtimeUserId !== userId) return

  subscriberCount--
  if (subscriberCount <= 0) {
    if (realtimeChannel) {
      realtimeChannel.unsubscribe()
      realtimeChannel = null
    }
    realtimeUserId = null
    subscriberCount = 0
    useNotificationStore.setState({ isConnected: false })
    stopPolling()
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
    startPolling(userId)
  },

  _destroy: (userId: string) => {
    releaseRealtime(userId)
  },
}))
