'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { LocalNotifications } from '@capacitor/local-notifications'
import type {
  LocalNotificationSchema,
  LocalNotificationDescriptor,
  Schedule,
  ScheduleOn,
  ScheduleEvery,
  Channel,
  PermissionStatus,
  Weekday,
  Importance,
  Visibility,
  ActionPerformed,
  Attachment,
} from '@capacitor/local-notifications'

export type {
  LocalNotificationSchema,
  LocalNotificationDescriptor,
  Schedule,
  ScheduleOn,
  ScheduleEvery,
  Channel,
  PermissionStatus,
  Weekday,
  Importance,
  Visibility,
  ActionPerformed,
  Attachment,
}

export interface UseLocalNotificationsReturn {
  /** Permission status for displaying notifications */
  permissionStatus: PermissionStatus | null
  /** List of pending (scheduled) notifications */
  pendingNotifications: LocalNotificationSchema[]
  /** List of delivered (visible) notifications */
  deliveredNotifications: LocalNotificationSchema[]
  /** Last notification received while app is in foreground */
  lastNotification: LocalNotificationSchema | null
  /** Last action performed on a notification */
  lastAction: ActionPerformed | null
  /** Schedule one or more local notifications */
  schedule: (notifications: LocalNotificationSchema[]) => Promise<LocalNotificationDescriptor[]>
  /** Get all pending notifications */
  getPending: () => Promise<LocalNotificationSchema[]>
  /** Cancel pending notifications by id */
  cancel: (ids: number[]) => Promise<void>
  /** Cancel all pending notifications */
  cancelAll: () => Promise<void>
  /** Check if notifications are enabled (deprecated — use checkPermissions) */
  areEnabled: () => Promise<boolean>
  /** Check notification permissions */
  checkPermissions: () => Promise<PermissionStatus>
  /** Request notification permissions */
  requestPermissions: () => Promise<PermissionStatus>
  /** Get delivered (visible) notifications */
  getDelivered: () => Promise<LocalNotificationSchema[]>
  /** Remove specific delivered notifications */
  removeDelivered: (ids: number[]) => Promise<void>
  /** Remove all delivered notifications */
  removeAllDelivered: () => Promise<void>
  /** Create a notification channel (Android only) */
  createChannel: (channel: Channel) => Promise<void>
  /** Delete a notification channel (Android only) */
  deleteChannel: (id: string) => Promise<void>
  /** List all notification channels (Android only) */
  listChannels: () => Promise<Channel[]>
  /** Clear the last notification / action */
  clearLastEvent: () => void
}

/**
 * React hook for scheduling and managing local notifications using
 * @capacitor/local-notifications.
 *
 * Provides scheduling, canceling, permission management, and event
 * listening for received notifications and performed actions.
 * Gracefully handles web/non-Capacitor environments.
 *
 * @example
 * ```tsx
 * const { schedule, requestPermissions } = useLocalNotifications()
 * await requestPermissions()
 * await schedule([{ id: 1, title: 'Rappel', body: 'Paiement loyer dû' }])
 * ```
 */
export function useLocalNotifications(): UseLocalNotificationsReturn {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null)
  const [pendingNotifications, setPendingNotifications] = useState<LocalNotificationSchema[]>([])
  const [deliveredNotifications, setDeliveredNotifications] = useState<LocalNotificationSchema[]>([])
  const [lastNotification, setLastNotification] = useState<LocalNotificationSchema | null>(null)
  const [lastAction, setLastAction] = useState<ActionPerformed | null>(null)
  const listenersRef = useRef<Array<{ remove: () => void }>>([])

  const getPending = useCallback(async (): Promise<LocalNotificationSchema[]> => {
    try {
      const result = await LocalNotifications.getPending()
      const list = result.notifications || []
      setPendingNotifications(list as unknown as LocalNotificationSchema[])
      return list as unknown as LocalNotificationSchema[]
    } catch {
      setPendingNotifications([])
      return []
    }
  }, [])

  const getDelivered = useCallback(async (): Promise<LocalNotificationSchema[]> => {
    try {
      const result = await LocalNotifications.getDeliveredNotifications()
      const list = result.notifications || []
      setDeliveredNotifications(list as unknown as LocalNotificationSchema[])
      return list as unknown as LocalNotificationSchema[]
    } catch {
      setDeliveredNotifications([])
      return []
    }
  }, [])

  const refreshPending = useCallback(() => {
    getPending().catch(() => {})
  }, [getPending])

  const refreshDelivered = useCallback(() => {
    getDelivered().catch(() => {})
  }, [getDelivered])

  const schedule = useCallback(async (
    notifications: LocalNotificationSchema[]
  ): Promise<LocalNotificationDescriptor[]> => {
    try {
      const result = await LocalNotifications.schedule({ notifications })
      refreshPending()
      return result.notifications
    } catch {
      return []
    }
  }, [refreshPending])

  const cancel = useCallback(async (ids: number[]) => {
    try {
      await LocalNotifications.cancel({
        notifications: ids.map((id) => ({ id })),
      })
      refreshPending()
    } catch {
      // Noop on web
    }
  }, [refreshPending])

  const cancelAll = useCallback(async () => {
    const pending = await getPending()
    if (pending.length > 0) {
      await cancel(pending.map((n) => n.id))
    }
  }, [getPending, cancel])

  const areEnabled = useCallback(async (): Promise<boolean> => {
    try {
      const result = await LocalNotifications.areEnabled()
      return result.value
    } catch {
      return true
    }
  }, [])

  const checkPermissions = useCallback(async (): Promise<PermissionStatus> => {
    try {
      const status = await LocalNotifications.checkPermissions()
      setPermissionStatus(status)
      return status
    } catch {
      const fallback: PermissionStatus = { display: 'granted' }
      setPermissionStatus(fallback)
      return fallback
    }
  }, [])

  const requestPermissions = useCallback(async (): Promise<PermissionStatus> => {
    try {
      const status = await LocalNotifications.requestPermissions()
      setPermissionStatus(status)
      return status
    } catch {
      const fallback: PermissionStatus = { display: 'granted' }
      setPermissionStatus(fallback)
      return fallback
    }
  }, [])

  const removeDelivered = useCallback(async (ids: number[]) => {
    try {
      await LocalNotifications.removeDeliveredNotifications({
        notifications: ids.map((id) => ({ id })) as any,
      })
      refreshDelivered()
    } catch {
      // Noop on web
    }
  }, [refreshDelivered])

  const removeAllDelivered = useCallback(async () => {
    try {
      await LocalNotifications.removeAllDeliveredNotifications()
      setDeliveredNotifications([])
    } catch {
      // Noop on web
    }
  }, [])

  const createChannel = useCallback(async (channel: Channel) => {
    try {
      await LocalNotifications.createChannel(channel)
    } catch {
      // Noop on web
    }
  }, [])

  const deleteChannel = useCallback(async (id: string) => {
    try {
      await LocalNotifications.deleteChannel({ id })
    } catch {
      // Noop on web
    }
  }, [])

  const listChannels = useCallback(async (): Promise<Channel[]> => {
    try {
      const result = await LocalNotifications.listChannels()
      return result.channels || []
    } catch {
      return []
    }
  }, [])

  const clearLastEvent = useCallback(() => {
    setLastNotification(null)
    setLastAction(null)
  }, [])

  // Fetch initial state
  useEffect(() => {
    checkPermissions()
    getPending()
  }, [checkPermissions, getPending])

  // Listen for notification events
  useEffect(() => {
    let cancelled = false

    const attach = (
      p: Promise<{ remove: () => void }>
    ) => {
      p.then((l) => {
        if (cancelled) {
          l.remove()
          return
        }
        listenersRef.current.push(l)
      })
    }

    attach(
      LocalNotifications.addListener('localNotificationReceived', (notification) => {
        setLastNotification(notification)
      })
    )

    attach(
      LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        setLastAction(action)
      })
    )

    return () => {
      cancelled = true
      listenersRef.current.forEach((l) => l.remove())
      listenersRef.current = []
    }
  }, [])

  return {
    permissionStatus,
    pendingNotifications,
    deliveredNotifications,
    lastNotification,
    lastAction,
    schedule,
    getPending,
    cancel,
    cancelAll,
    areEnabled,
    checkPermissions,
    requestPermissions,
    getDelivered,
    removeDelivered,
    removeAllDelivered,
    createChannel,
    deleteChannel,
    listChannels,
    clearLastEvent,
  }
}
