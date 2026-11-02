'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

type OwnerFileEvent = 'INSERT' | 'UPDATE' | 'DELETE'

interface UseRealtimeOwnerFilesOptions {
  userId: string | undefined
  watchAll?: boolean
  onOwnerFileChange: (event: OwnerFileEvent) => void
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
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'owner_files',
            filter: watchAllRef.current ? undefined : `owner_id=eq.${userId}`,
          },
          () => {
            callbackRef.current('UPDATE')
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'owner_file_documents',
          },
          () => {
            callbackRef.current('UPDATE')
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[realtime-owner-files] Subscribed')
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('[realtime-owner-files] Channel error')
          }
        })
    }

    subscribeAfterAuth()

    const pollInterval = setInterval(() => {
      if (!cancelled) {
        callbackRef.current('UPDATE')
      }
    }, 15_000)

    return () => {
      cancelled = true
      channel.unsubscribe()
      clearInterval(pollInterval)
    }
  }, [userId])
}
