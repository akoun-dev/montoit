'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimeOwnershipDocPayload {
  id: string
  type: string
  url: string
  name: string
  status: string
  tc_comment: string | null
  created_at: string
  owner_id: string
  reviewed_by_id: string | null
}

type OwnershipDocEvent = 'INSERT' | 'UPDATE' | 'DELETE'

interface UseRealtimeOwnershipDocsOptions {
  userId: string | undefined
  /**
   * If true, watches ALL ownership_docs (for TC/admin).
   * Otherwise, filters by `owner_id`.
   */
  watchAll?: boolean
  onOwnershipDocChange: (event: OwnershipDocEvent, payload: RealtimeOwnershipDocPayload) => void
}

/**
 * Subscribes to all events on the `ownership_documents` table
 * via Supabase Realtime.
 *
 * Filters by:
 *   - `owner_id === userId` (owner seeing own docs)
 *   - OR `watchAll` (TC/admin seeing all docs)
 */
export function useRealtimeOwnershipDocs({ userId, watchAll, onOwnershipDocChange }: UseRealtimeOwnershipDocsOptions) {
  const callbackRef = useRef(onOwnershipDocChange)
  callbackRef.current = onOwnershipDocChange

  const watchAllRef = useRef(watchAll)
  watchAllRef.current = watchAll

  useEffect(() => {
    if (!userId) return

    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel('ownership-docs-realtime')
      .on<RealtimeOwnershipDocPayload>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ownership_documents',
        },
        (payload: RealtimePostgresChangesPayload<RealtimeOwnershipDocPayload>) => {
          const raw = payload.eventType === 'DELETE' ? payload.old : payload.new
          if (!raw?.id) return

          const doc = raw as RealtimeOwnershipDocPayload

          // Filter: watchAll or own document
          if (!watchAllRef.current && doc.owner_id !== userId) return

          callbackRef.current(payload.eventType as OwnershipDocEvent, doc)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[realtime-ownership-docs] Subscribed')
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[realtime-ownership-docs] Channel error')
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [userId])
}
