'use client'

import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { usePaymentAlertStore } from '@/lib/payment-alert-store'

/**
 * Hook that provides the count of unpaid + overdue payments for the sidebar badge.
 * Refreshes on mount and polls every 30 seconds for near-real-time accuracy.
 */
export function usePaymentAlerts() {
  const { user, isAuthenticated } = useAuthStore()

  const unpaidCount = usePaymentAlertStore((s) => s.unpaidCount)
  const loading = usePaymentAlertStore((s) => s.loading)
  const refreshAlerts = usePaymentAlertStore((s) => s.refreshAlerts)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Only poll for LOCATAIRE role (or activeRole)
  const effectiveRole = user?.activeRole || user?.role
  const isLocataire = effectiveRole === 'LOCATAIRE'

  useEffect(() => {
    if (!user || !isAuthenticated || !isLocataire) return

    refreshAlerts()

    intervalRef.current = setInterval(refreshAlerts, 30_000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [user?.id, isAuthenticated, isLocataire, refreshAlerts])

  return { unpaidCount, loading, refreshAlerts }
}
