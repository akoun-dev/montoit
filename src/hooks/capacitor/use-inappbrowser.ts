'use client'

import { useState, useCallback, useRef } from 'react'

export interface UseInAppBrowserReturn {
  /** Open a URL in the in-app browser */
  openInWebView: (url: string) => Promise<void>
  /** Close the in-app browser */
  close: () => Promise<void>
  /** Whether the in-app browser is currently open */
  isOpen: boolean
}

/**
 * React hook for opening external URLs INSIDE the app using
 * `@capacitor/inappbrowser`.
 *
 * Unlike `@capacitor/browser` (which opens in Chrome Custom Tabs /
 * SFSafariViewController and temporarily leaves the app), this keeps the
 * user strictly inside the app's own WebView — ideal for flows where you
 * want to maintain full app context (e.g. KYC document upload, property
 * virtual tours, opening PDFs).
 *
 * Falls back to `window.open()` when Capacitor is not available.
 *
 * @example
 * ```tsx
 * const { openInWebView, close } = useInAppBrowser()
 *
 * // Open the NeoFace KYC URL inside the app
 * await openInWebView('https://neoface.aineo.ai/api/selfie_facematch/doc-xxx')
 * ```
 */
export function useInAppBrowser(): UseInAppBrowserReturn {
  const [isOpen, setIsOpen] = useState(false)
  const openedRef = useRef<Window | null>(null)

  const openInWebView = useCallback(async (url: string) => {
    try {
      const { InAppBrowser } = await import('@capacitor/inappbrowser')
      await InAppBrowser.openInWebView({
        url,
        options: {
          showURL: false,
          showToolbar: true,
          clearCache: false,
          clearSessionCache: false,
          mediaPlaybackRequiresUserAction: false,
          closeButtonText: 'Fermer',
          toolbarPosition: 1, // BOTTOM
          showNavigationButtons: true,
          leftToRight: false,
          android: {
            allowZoom: true,
            hardwareBack: true,
            pauseMedia: true,
            isIsolated: false,
          },
          iOS: {
            allowOverScroll: false,
            enableViewportScale: false,
            allowInLineMediaPlayback: true,
            surpressIncrementalRendering: false,
            viewStyle: 1, // FORM_SHEET
            animationEffect: 0, // FLIP_HORIZONTAL
            allowsBackForwardNavigationGestures: true,
          },
        },
      })
      setIsOpen(true)
    } catch {
      // Fallback: open in a new window/tab
      const win = window.open(url, '_blank')
      if (win) {
        openedRef.current = win
        setIsOpen(true)
      }
    }
  }, [])

  const close = useCallback(async () => {
    try {
      const { InAppBrowser } = await import('@capacitor/inappbrowser')
      await InAppBrowser.close()
    } catch {
      if (openedRef.current) {
        openedRef.current.close()
        openedRef.current = null
      }
    }
    setIsOpen(false)
  }, [])

  return { openInWebView, close, isOpen }
}
