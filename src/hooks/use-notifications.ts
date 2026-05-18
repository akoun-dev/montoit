'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/lib/auth-store'
import { toast } from 'sonner'

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
    fetch('/api/notifications?limit=1')
      .then((r) => r.json())
      .then((data) => {
        setUnreadCount(data.unreadCount || 0)
      })
      .catch(() => {
        // Silently ignore — will retry on next render
      })

    return () => {
      socket.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
  }, [user])

  const markAsRead = useCallback(async (notificationIds: string[]) => {
    if (notificationIds.length === 0) return

    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationIds }),
    })

    setUnreadCount((prev) => Math.max(0, prev - notificationIds.length))
    setNotifications((prev) =>
      prev.map((n) =>
        notificationIds.includes(n.id) ? { ...n, isRead: true } : n
      )
    )
  }, [])

  const markAllRead = useCallback(async () => {
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
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
  }
}
