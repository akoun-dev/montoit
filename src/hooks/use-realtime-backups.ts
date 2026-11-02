'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimeBackupPayload {
  id: string
  file_name: string
  size: string | null
  status: string
  type: string
  created_at: string
  completed_at: string | null
}

type BackupChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE'

interface UseRealtimeBackupsOptions {
  userId: string | undefined
  onBackupChange: (event: BackupChangeEvent, payload: RealtimeBackupPayload) => void
}

/**
 * Subscribes to all events on the `backups` table
 * via Supabase Realtime.
 *
 * Forwards all backup events (admin-only view).
 */
export function useRealtimeBackups({ userId, onBackupChange }: UseRealtimeBackupsOptions) {
  const callbackRef = useRef(onBackupChange)

  useEffect(() => {
    callbackRef.current = onBackupChange
  }, [onBackupChange])

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    const supabase = getSupabaseBrowserClient()

    // Create the channel synchronously so cleanup always works
    const channel = supabase.channel('backups-realtime')

    async function subscribeAfterAuth() {
      const { data: { session } } = await supabase.auth.getSession()

      if (cancelled) return

      if (!session?.access_token) {
        console.warn('[realtime-backups] No session — subscribing anyway (will likely fail)')
      }

      channel
        .on<RealtimeBackupPayload>(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'backups',
          },
          (payload: RealtimePostgresChangesPayload<RealtimeBackupPayload>) => {
            const raw = payload.eventType === 'DELETE' ? payload.old : payload.new
            if (!raw?.id) return

            callbackRef.current(payload.eventType as BackupChangeEvent, raw as RealtimeBackupPayload)
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[realtime-backups] Subscribed')
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('[realtime-backups] Channel error')
          }
        })
    }

    subscribeAfterAuth()

    return () => {
      cancelled = true
      channel.unsubscribe()
    }
  }, [userId])
}
