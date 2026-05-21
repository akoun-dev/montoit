'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimeRatingPayload {
  id: string
  score: number
  comment: string | null
  reply: string | null
  replied_at: string | null
  property_id: string | null
  created_at: string
  lease_id: string
  from_user_id: string
  to_user_id: string
}

type RatingChangeEvent = 'INSERT' | 'UPDATE'

interface UseRealtimeRatingsOptions {
  userId: string | undefined
  /**
   * If true, receives ALL rating events (for admin).
   */
  watchAll?: boolean
  onRatingChange: (event: RatingChangeEvent, payload: RealtimeRatingPayload) => void
}

/**
 * Subscribes to INSERT and UPDATE events on the `ratings` table
 * via Supabase Realtime.
 *
 * Filters by:
 *   - `to_user_id === userId` (reviews received)
 *   - OR `from_user_id === userId` (reviews given)
 *   - OR `watchAll` (admin)
 */
export function useRealtimeRatings({ userId, watchAll, onRatingChange }: UseRealtimeRatingsOptions) {
  const callbackRef = useRef(onRatingChange)
  callbackRef.current = onRatingChange

  const watchAllRef = useRef(watchAll)
  watchAllRef.current = watchAll

  useEffect(() => {
    if (!userId) return

    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel('ratings-realtime')
      .on<RealtimeRatingPayload>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ratings',
        },
        (payload: RealtimePostgresChangesPayload<RealtimeRatingPayload>) => {
          const raw = payload.eventType === 'DELETE' ? payload.old : payload.new
          if (!raw?.id) return

          const rating = raw as RealtimeRatingPayload

          // Skip DELETEs — only forward INSERT/UPDATE
          if (payload.eventType === 'DELETE') return

          // watchAll forwards everything
          if (watchAllRef.current) {
            callbackRef.current(payload.eventType as RatingChangeEvent, rating)
            return
          }

          // Filter: user is the target (received) or the author (given)
          const isTarget = rating.to_user_id === userId
          const isAuthor = rating.from_user_id === userId

          if (!isTarget && !isAuthor) return

          callbackRef.current(payload.eventType as RatingChangeEvent, rating)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[realtime-ratings] Subscribed')
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[realtime-ratings] Channel error')
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [userId])
}
