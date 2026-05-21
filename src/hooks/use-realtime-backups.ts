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
  callbackRef.current = onBackupChange

  useEffect(() => {
    if (!userId) return

    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel('backups-realtime')
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

    return () => {
      channel.unsubscribe()
    }
  }, [userId])
}
