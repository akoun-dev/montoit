'use client'

import { useCallback } from 'react'
import { AppLauncher } from '@capacitor/app-launcher'
import type { CanOpenURLResult, OpenURLResult } from '@capacitor/app-launcher'

export interface UseAppLauncherReturn {
  /** Check if an app can be opened with the given URL */
  canOpenUrl: (url: string) => Promise<CanOpenURLResult>
  /** Open an app with the given URL (URL scheme or Android package name) */
  openUrl: (url: string) => Promise<OpenURLResult>
}

/**
 * React hook for launching other apps using @capacitor/app-launcher.
 *
 * Allows checking if an app is installed and opening it via URL scheme
 * or Android package name.
 *
 * @example
 * ```tsx
 * const { canOpenUrl, openUrl } = useAppLauncher()
 *
 * // Open Google Maps with a location
 * const { value: canOpen } = await canOpenUrl('com.google.android.apps.maps')
 * if (canOpen) {
 *   await openUrl('geo:0,0?q=Abidjan')
 * }
 * ```
 */
export function useAppLauncher(): UseAppLauncherReturn {
  const canOpenUrl = useCallback(
    async (url: string): Promise<CanOpenURLResult> => {
      try {
        return await AppLauncher.canOpenUrl({ url })
      } catch {
        return { value: false }
      }
    },
    []
  )

  const openUrl = useCallback(
    async (url: string): Promise<OpenURLResult> => {
      try {
        return await AppLauncher.openUrl({ url })
      } catch {
        return { completed: false }
      }
    },
    []
  )

  return { canOpenUrl, openUrl }
}
