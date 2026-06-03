'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimeOwnerFileDocPayload {
  id: string
  owner_file_id: string
  type: string
  name: string
  url: string
  status: string
  tc_comment: string | null
  created_at: string
}

type OwnerFileEvent = 'INSERT' | 'UPDATE' | 'DELETE'

interface UseRealtimeOwnerFilesOptions {
  userId: string | undefined
  watchAll?: boolean
  onOwnerFileChange: (event: OwnerFileEvent, payload: RealtimeOwnerFileDocPayload) => void
}

export function useRealtimeOwnerFiles({ userId, watchAll, onOwnerFileChange }: UseRealtimeOwnerFilesOptions) {
  const callbackRef = useRef(onOwnerFileChange)
  const watchAllRef = useRef(watchAll)

  useEffect(() => {
    callbackRef.current = onOwnerFileChange
    watchAllRef.current = watchAll
  }, [onOwnerFileChange, watchAll])

  useEffect(() => {
    if (!userId) return

    let cancelled = false
    const supabase = getSupabaseBrowserClient()
    const channel = supabase.channel('owner-files-realtime')

    async function subscribeAfterAuth() {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return

      channel
        .on<RealtimeOwnerFileDocPayload>(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'owner_file_documents',
          },
          (payload: RealtimePostgresChangesPayload<RealtimeOwnerFileDocPayload>) => {
            const raw = payload.eventType === 'DELETE' ? payload.old : payload.new
            if (!raw?.id) return
            callbackRef.current(payload.eventType as OwnerFileEvent, raw as RealtimeOwnerFileDocPayload)
          }
        )
        .subscribe()
    }

    subscribeAfterAuth()

    return () => {
      cancelled = true
      channel.unsubscribe()
    }
  }, [userId])
}
