'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/lib/auth-store'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/capacitor'

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
  const socketRef = useRef<Socket | null>(null)

  /**
   * Refresh the unread notification count from the REST API.
   * Only updates `unreadCount` — never touches the `notifications` array
   * to avoid overwriting real-time WebSocket data.
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

    // Connect to WebSocket notification service
    const socket = io('/?XTransformPort=3003', {
      path: '/socket.io/',
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    })

    socket.on('connect', () => {
      console.log('[notifications] WebSocket connected, joining room for user:', user.id)
      socket.emit('join', { userId: user.id })
      setIsConnected(true)
    })

    socket.on('notification', (data: Notification) => {
      setUnreadCount((prev) => prev + 1)
      setNotifications((prev) => [data, ...prev])

      // Show toast notification
      toast(data.title, {
        description: data.message,
      })
    })

    socket.on('disconnect', (reason) => {
      console.log('[notifications] WebSocket disconnected:', reason)
      setIsConnected(false)
    })

    socket.on('connect_error', (error) => {
      console.warn('[notifications] WebSocket connection error:', error.message)
    })

    socketRef.current = socket

    // Fetch initial unread count from REST API
    refreshNotifications()

    return () => {
      socket.disconnect()
      socketRef.current = null
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
