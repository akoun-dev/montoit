'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { App } from '@capacitor/app'
import type { AppInfo, AppState, AppLaunchUrl } from '@capacitor/app'

export interface UseAppReturn {
  /** Current app state (active/inactive) */
  state: AppState | null
  /** App metadata (name, id, version, build) */
  info: AppInfo | null
  /** URL the app was launched with (if any) */
  launchUrl: AppLaunchUrl | undefined
  /** Whether the app is currently active */
  isActive: boolean
  /** Force exit the app (Android only, use with backButton) */
  exitApp: () => Promise<void>
  /** Get fresh app info */
  getInfo: () => Promise<AppInfo>
  /** Minimize the app (Android only) */
  minimizeApp: () => Promise<void>
}

/**
 * React hook for managing app lifecycle using @capacitor/app.
 *
 * Provides app state (active/inactive), app info, launch URL,
 * and access to app lifecycle events (pause, resume, back button).
 *
 * @example
 * ```tsx
 * const { isActive, info } = useApp()
 * // Handle app state changes
 * ```
 */
export function useApp(): UseAppReturn {
  const [state, setState] = useState<AppState | null>(null)
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [launchUrl, setLaunchUrl] = useState<AppLaunchUrl | undefined>(undefined)
  const listenersRef = useRef<Array<{ remove: () => void }>>([])

  const isActive = state?.isActive ?? true

  // Fetch app info on mount
  useEffect(() => {
    App.getInfo().then(setInfo).catch(() => {})
    App.getLaunchUrl().then(setLaunchUrl).catch(() => {})
    App.getState().then(setState).catch(() => {})
  }, [])

  // Listen for app lifecycle events
  useEffect(() => {
    let cancelled = false

    const attachListener = (
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

    attachListener(
      App.addListener('appStateChange', (newState) => {
        setState(newState)
      })
    )

    attachListener(
      App.addListener('pause', () => {
        // App went to background
      })
    )

    attachListener(
      App.addListener('resume', () => {
        App.getState().then(setState).catch(() => {})
      })
    )

    attachListener(
      App.addListener('appUrlOpen', (event) => {
        setLaunchUrl({ url: event.url })
      })
    )

    return () => {
      cancelled = true
      listenersRef.current.forEach((l) => l.remove())
      listenersRef.current = []
    }
  }, [])

  const exitApp = useCallback(async () => {
    await App.exitApp()
  }, [])

  const getInfo = useCallback(async (): Promise<AppInfo> => {
    const appInfo = await App.getInfo()
    setInfo(appInfo)
    return appInfo
  }, [])

  const minimizeApp = useCallback(async () => {
    await App.minimizeApp()
  }, [])

  return {
    state,
    info,
    launchUrl,
    isActive,
    exitApp,
    getInfo,
    minimizeApp,
  }
}
