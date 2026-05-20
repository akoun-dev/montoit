'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Browser } from '@capacitor/browser'
import type { OpenOptions } from '@capacitor/browser'

export interface UseBrowserReturn {
  /** Open a URL in an external browser */
  open: (url: string, options?: Omit<OpenOptions, 'url'>) => Promise<void>
  /** Close the currently open browser (Web & iOS only) */
  close: () => Promise<void>
  /** Whether a browser window is currently open */
  isOpen: boolean
  /** Whether the browser finished closing */
  wasClosed: boolean
}

/**
 * React hook for opening external URLs using @capacitor/browser.
 *
 * In web mode (non-Capacitor), falls back to `window.open()`.
 *
 * @example
 * ```tsx
 * const { open, isOpen } = useBrowser()
 * await open('https://example.com', { toolbarColor: '#1e40af' })
 * ```
 */
export function useBrowser(): UseBrowserReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [wasClosed, setWasClosed] = useState(false)
  const listenersRef = useRef<Array<{ remove: () => void }>>([])

  useEffect(() => {
    let cancelled = false

    Browser.addListener('browserFinished', () => {
      setIsOpen(false)
      setWasClosed(true)
    }).then((l) => {
      if (cancelled) { l.remove(); return }
      listenersRef.current.push(l)
    })

    Browser.addListener('browserPageLoaded', () => {
      // La page s'est chargée dans le navigateur
    }).then((l) => {
      if (cancelled) { l.remove(); return }
      listenersRef.current.push(l)
    })

    return () => {
      cancelled = true
      listenersRef.current.forEach((l) => l.remove())
      listenersRef.current = []
    }
  }, [])

  const open = useCallback(
    async (url: string, options?: Omit<OpenOptions, 'url'>) => {
      setWasClosed(false)
      try {
        await Browser.open({ url, ...options })
        setIsOpen(true)
      } catch {
        // Web fallback
        window.open(url, '_blank', 'noopener,noreferrer')
        setIsOpen(true)
      }
    },
    []
  )

  const close = useCallback(async () => {
    try {
      await Browser.close()
    } catch {
      // No-op on platforms that don't support close
    }
    setIsOpen(false)
  }, [])

  return { open, close, isOpen, wasClosed }
}
