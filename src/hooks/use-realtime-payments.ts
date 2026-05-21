'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimePaymentPayload {
  id: string
  amount: number
  status: string
  due_date: string
  paid_at: string | null
  reference: string | null
  method: string | null
  lease_id: string
  tenant_id: string
  created_at: string
  updated_at: string
}

type PaymentChangeEvent = 'INSERT' | 'UPDATE'

interface UseRealtimePaymentsOptions {
  userId: string | undefined
  /**
   * Lease IDs the user is involved in (as tenant or owner).
   * If not provided, filtering is done only by tenant_id.
   */
  leaseIds?: string[]
  onPaymentChange: (event: PaymentChangeEvent, payload: RealtimePaymentPayload) => void
}

/**
 * Subscribes to INSERT and UPDATE events on the `payments` table
 * via Supabase Realtime.
 *
 * The hook filters incoming events to only call `onPaymentChange` for payments
 * relevant to the current user:
 *   - If `tenant_id === userId` → the user is the tenant
 *   - If `lease_id` is in `leaseIds` → the user is the owner
 */
export function useRealtimePayments({ userId, leaseIds, onPaymentChange }: UseRealtimePaymentsOptions) {
  const callbackRef = useRef(onPaymentChange)
  callbackRef.current = onPaymentChange

  const leaseIdsRef = useRef(leaseIds)
  leaseIdsRef.current = leaseIds

  useEffect(() => {
    if (!userId) return

    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel('payments-realtime')
      .on<RealtimePaymentPayload>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
        },
        (payload: RealtimePostgresChangesPayload<RealtimePaymentPayload>) => {
          const payment = payload.eventType === 'DELETE' ? payload.old : payload.new
          if (!payment?.id) return

          // Skip if the payment isn't relevant to the current user
          const isTenant = payment.tenant_id === userId
          const isOwner = leaseIdsRef.current?.includes(payment.lease_id)

          if (!isTenant && !isOwner) return

          callbackRef.current(payload.eventType as PaymentChangeEvent, payment)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[realtime-payments] Subscribed')
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[realtime-payments] Channel error')
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [userId])
}
