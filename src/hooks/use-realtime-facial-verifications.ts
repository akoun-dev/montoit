'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimeFacialVerificationPayload {
  uuid: string
  user_id: string
  provider: string
  document_id: string | null
  selfie_url: string | null
  status: string
  matching_score: number | null
  is_match: boolean | null
  is_live: boolean | null
  failure_reason: string | null
  created_at: string
  updated_at: string
  verified_at: string | null
}

type FacialVerificationEvent = 'INSERT' | 'UPDATE' | 'DELETE'

interface UseRealtimeFacialVerificationsOptions {
  userId: string | undefined
  /**
   * If true, watches ALL facial verifications (TC/admin).
   * Otherwise, filters by `user_id`.
   */
  watchAll?: boolean
  onFacialVerificationChange: (event: FacialVerificationEvent, payload: RealtimeFacialVerificationPayload) => void
}

/**
 * Subscribes to all events on the `facial_verifications` table
 * via Supabase Realtime.
 *
 * Filters by:
 *   - `user_id === userId` (own verification)
 *   - OR `watchAll` (TC/admin seeing all verifications)
 */
export function useRealtimeFacialVerifications({
  userId,
  watchAll,
  onFacialVerificationChange,
}: UseRealtimeFacialVerificationsOptions) {
  const callbackRef = useRef(onFacialVerificationChange)
  callbackRef.current = onFacialVerificationChange

  const watchAllRef = useRef(watchAll)
  watchAllRef.current = watchAll

  useEffect(() => {
    if (!userId) return

    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel('facial-verifications-realtime')
      .on<RealtimeFacialVerificationPayload>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'facial_verifications',
        },
        (payload: RealtimePostgresChangesPayload<RealtimeFacialVerificationPayload>) => {
          const raw = payload.eventType === 'DELETE' ? payload.old : payload.new
          if (!raw?.uuid) return

          const fv = raw as RealtimeFacialVerificationPayload

          // Filter: watchAll or own verification
          if (!watchAllRef.current && fv.user_id !== userId) return

          callbackRef.current(payload.eventType as FacialVerificationEvent, fv)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[realtime-facial-verifications] Subscribed')
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[realtime-facial-verifications] Channel error')
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [userId])
}
