'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimeRentalFilePayload {
  id: string
  status: string
  monthly_income: number | null
  employer: string | null
  employment_type: string | null
  rejection_reason: string | null
  tc_comment: string | null
  tenant_id: string
  reviewed_by_id: string | null
  created_at: string
  updated_at: string
}

type RentalFileChangeEvent = 'INSERT' | 'UPDATE'

interface UseRealtimeRentalFilesOptions {
  userId: string | undefined
  /**
   * List of tenant IDs whose rental files the user wants to watch (for owners).
   * If omitted, filtering uses only `tenant_id` (for tenants).
   */
  watchedTenantIds?: string[]
  /**
   * If true, watches ALL rental files (for TC/admin).
   */
  watchAll?: boolean
  onRentalFileChange: (event: RentalFileChangeEvent, payload: RealtimeRentalFilePayload) => void
}

/**
 * Subscribes to INSERT and UPDATE events on the `rental_files` table
 * via Supabase Realtime.
 *
 * The hook filters incoming events to only call `onRentalFileChange` for
 * files relevant to the current user:
 *   - If `tenant_id === userId` → the user is the tenant (own file)
 *   - If `tenant_id` is in `watchedTenantIds` → the user is an owner watching
 */
export function useRealtimeRentalFiles({ userId, watchedTenantIds, watchAll, onRentalFileChange }: UseRealtimeRentalFilesOptions) {
  const callbackRef = useRef(onRentalFileChange)
  callbackRef.current = onRentalFileChange

  const watchedRef = useRef(watchedTenantIds)
  watchedRef.current = watchedTenantIds

  const watchAllRef = useRef(watchAll)
  watchAllRef.current = watchAll

  useEffect(() => {
    if (!userId) return

    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel('rental-files-realtime')
      .on<RealtimeRentalFilePayload>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rental_files',
        },
        (payload: RealtimePostgresChangesPayload<RealtimeRentalFilePayload>) => {
          const raw = payload.eventType === 'DELETE' ? payload.old : payload.new
          if (!raw?.id) return

          const rf = raw as RealtimeRentalFilePayload

          // Skip if the file isn't relevant
          if (watchAllRef.current) {
            callbackRef.current(payload.eventType as RentalFileChangeEvent, rf)
            return
          }

          const isOwnFile = rf.tenant_id === userId
          const isWatched = watchedRef.current?.includes(rf.tenant_id)

          if (!isOwnFile && !isWatched) return

          callbackRef.current(payload.eventType as RentalFileChangeEvent, rf)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[realtime-rental-files] Subscribed')
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[realtime-rental-files] Channel error')
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [userId])
}
