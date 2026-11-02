'use client'

import { createContext, useContext, useCallback, useRef, type ReactNode } from 'react'

interface BackAction {
  /** Unique key to avoid stale registrations (e.g. component name + id) */
  key: string
  /** Callback invoked when the hardware back button is pressed */
  onBack: () => void
}

interface BackNavigationContextValue {
  /** Register a back action (call on mount of a detail view) */
  registerBackAction: (action: BackAction) => void
  /** Unregister (call on unmount) */
  unregisterBackAction: (key: string) => void
  /** Returns the most recently registered back action, or null */
  resolveBackAction: () => BackAction | null
}

const BackNavigationContext = createContext<BackNavigationContextValue | null>(null)

/**
 * Provider that keeps a stack of registered back-navigation callbacks.
 * Dashboard detail views push their `onBack` on mount and pop on unmount,
 * allowing the hardware back button to delegate to the correct SPA callback.
 */
export function BackNavigationProvider({ children }: { children: ReactNode }) {
  const stackRef = useRef<BackAction[]>([])

  const registerBackAction = useCallback((action: BackAction) => {
    // Remove any stale entry with the same key first
    stackRef.current = stackRef.current.filter((a) => a.key !== action.key)
    stackRef.current.push(action)
  }, [])

  const unregisterBackAction = useCallback((key: string) => {
    stackRef.current = stackRef.current.filter((a) => a.key !== key)
  }, [])

  const resolveBackAction = useCallback((): BackAction | null => {
    const stack = stackRef.current
    return stack.length > 0 ? stack[stack.length - 1] : null
  }, [])

  return (
    <BackNavigationContext.Provider value={{ registerBackAction, unregisterBackAction, resolveBackAction }}>
      {children}
    </BackNavigationContext.Provider>
  )
}

/**
 * Hook to access the back-navigation stack.
 * Dashboard detail views use this to register their onBack callback.
 */
export function useBackNavigation() {
  const ctx = useContext(BackNavigationContext)
  if (!ctx) {
    throw new Error('useBackNavigation must be used within a BackNavigationProvider')
  }
  return ctx
}
