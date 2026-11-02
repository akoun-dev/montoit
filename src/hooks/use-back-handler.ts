'use client'

import { useEffect } from 'react'
import { useBackNavigation } from '@/components/back-navigation-provider'

/**
 * Registers a callback for the Android hardware back button (via Capacitor's `App.addListener('backButton')`).
 * Call from dashboard detail/sub views to handle the back press.
 *
 * @param key - Unique key (e.g. component name + item id). Old registrations with the same key are automatically replaced.
 * @param onBack - Callback invoked when the hardware back button is pressed.
 */
export function useBackHandler(key: string, onBack: () => void) {
  const { registerBackAction, unregisterBackAction } = useBackNavigation()

  useEffect(() => {
    registerBackAction({ key, onBack })
    return () => unregisterBackAction(key)
  }, [key, onBack, registerBackAction, unregisterBackAction])
}
