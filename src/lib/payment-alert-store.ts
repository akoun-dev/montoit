'use client'

import { create } from 'zustand'
import { apiFetch } from '@/lib/capacitor'

interface PaymentAlertStore {
  unpaidCount: number
  loading: boolean
  refreshAlerts: () => Promise<void>
}

export const usePaymentAlertStore = create<PaymentAlertStore>((set) => ({
  unpaidCount: 0,
  loading: false,

  refreshAlerts: async () => {
    set({ loading: true })

    // Step 1: Check for newly overdue payments (non-blocking — don't affect badge)
    try {
      await apiFetch('/api/payments/check-overdue', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // Non-blocking: overdue check failure shouldn't hide the badge
    }

    // Step 2: Fetch the updated badge count
    try {
      const res = await apiFetch('/api/payments?limit=1', { credentials: 'include' })
      if (!res.ok) {
        set({ unpaidCount: 0, loading: false })
        return
      }
      const body = await res.json()
      const stats = body?.stats
      const count = (stats?.pendingCount ?? 0) + (stats?.latePaymentsCount ?? 0)
      set({ unpaidCount: count, loading: false })
    } catch {
      set({ unpaidCount: 0, loading: false })
    }
  },
}))
