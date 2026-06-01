'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { StatusBar, Style, Animation } from '@capacitor/status-bar'
import type { StatusBarInfo } from '@capacitor/status-bar'

export type { Style, Animation }
export type { StatusBarInfo }

export interface UseStatusBarReturn {
  /** Current status bar info */
  info: StatusBarInfo | null
  /** Whether the status bar is visible */
  isVisible: boolean
  /** Whether the status bar overlays the webview */
  isOverlaid: boolean
  /** Current style */
  style: Style | null
  /** Set status bar text style (Dark/Light/Default) */
  setStyle: (style: Style) => Promise<void>
  /** Set status bar background color (not on Android 15+) */
  setBackgroundColor: (color: string) => Promise<void>
  /** Show the status bar */
  show: (animation?: Animation) => Promise<void>
  /** Hide the status bar */
  hide: (animation?: Animation) => Promise<void>
  /** Refresh status bar info */
  refresh: () => Promise<void>
  /** Set whether the status bar overlays the webview (not on Android 15+) */
  setOverlaysWebView: (overlay: boolean) => Promise<void>
}

/**
 * React hook for managing the device status bar using @capacitor/status-bar.
 *
 * Provides style control, visibility toggling, and overlay configuration.
 * Gracefully handles web/non-Capacitor environments.
 *
 * @example
 * ```tsx
 * const { setStyle, isVisible } = useStatusBar()
 * setStyle(Style.Dark) // light text on dark bg
 * ```
 */
export function useStatusBar(): UseStatusBarReturn {
  const [info, setInfo] = useState<StatusBarInfo | null>(null)
  const [isVisible, setIsVisible] = useState(true)
  const [isOverlaid, setIsOverlaid] = useState(true)
  const [style, setStyleState] = useState<Style | null>(null)
  const listenersRef = useRef<Array<{ remove: () => void }>>([])

  const refresh = useCallback(async () => {
    try {
      const status = await StatusBar.getInfo()
      setInfo(status)
      setIsVisible(status.visible)
      setIsOverlaid(status.overlays)
      setStyleState(status.style)
    } catch {
      // Web fallback: assume visible, no overlay
      setInfo(null)
      setIsVisible(true)
      setIsOverlaid(false)
      setStyleState(null)
    }
  }, [])

  const setStyle = useCallback(async (s: Style) => {
    try {
      await StatusBar.setStyle({ style: s })
      setStyleState(s)
    } catch {
      // Noop on web
    }
  }, [])

  const setBackgroundColor = useCallback(async (color: string) => {
    try {
      await StatusBar.setBackgroundColor({ color })
    } catch {
      // Noop on web
    }
  }, [])

  const show = useCallback(async (animation?: Animation) => {
    try {
      await StatusBar.show(animation ? { animation } : undefined)
      setIsVisible(true)
    } catch {
      // Noop on web
    }
  }, [])

  const hide = useCallback(async (animation?: Animation) => {
    try {
      await StatusBar.hide(animation ? { animation } : undefined)
      setIsVisible(false)
    } catch {
      // Noop on web
    }
  }, [])

  const setOverlaysWebView = useCallback(async (overlay: boolean) => {
    try {
      await StatusBar.setOverlaysWebView({ overlay })
      setIsOverlaid(overlay)
    } catch {
      // Noop on web
    }
  }, [])

  useEffect(() => {
    StatusBar.getInfo().then((status) => {
      setInfo(status)
      setIsVisible(status.visible)
      setIsOverlaid(status.overlays)
      setStyleState(status.style)
    }).catch(() => {})

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
      StatusBar.addListener('statusBarVisibilityChanged', (status) => {
        setIsVisible(status.visible)
        setInfo(status)
      })
    )

    attach(
      StatusBar.addListener('statusBarOverlayChanged', (status) => {
        setIsOverlaid(status.overlays)
        setInfo(status)
      })
    )

    return () => {
      cancelled = true
      listenersRef.current.forEach((l) => l.remove())
      listenersRef.current = []
    }
  }, [refresh])

  return {
    info,
    isVisible,
    isOverlaid,
    style,
    setStyle,
    setBackgroundColor,
    show,
    hide,
    refresh,
    setOverlaysWebView,
  }
}
