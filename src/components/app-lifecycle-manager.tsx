'use client'

import { useEffect, useRef } from 'react'
import { useApp } from '@/hooks/capacitor/use-app'
import { useNotifications } from '@/hooks/use-notifications'

const DEBOUNCE_MS = 300

/**
 * Manages app lifecycle events using the `useApp` hook.
 *
 * - **Resume / foreground** : re-fetches notifications (badge count, list)
 *   so the user sees fresh data when returning to the app.
 *
 * Renders nothing — it is a pure side-effect component meant to be
 * mounted once in the root layout.
 */
export function AppLifecycleManager() {
  const { isActive } = useApp()
  const { refreshNotifications } = useNotifications()
  const lastRefreshRef = useRef(0)
  const isInitialMount = useRef(true)

  useEffect(() => {
    // Skip initial mount — useNotifications() already fetches on mount
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    const now = Date.now()
    if (now - lastRefreshRef.current < DEBOUNCE_MS) return

    lastRefreshRef.current = now
    refreshNotifications()
  }, [isActive, refreshNotifications])

  return null
}
